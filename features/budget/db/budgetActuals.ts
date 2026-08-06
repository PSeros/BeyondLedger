import {client} from "@/lib/prisma";
import {computeContractContribution} from "@/features/budget/period";

// Actual spend for a budget over a time window, summed across all member selector types.
// Variable selectors sum dated bills/items in the window. Fixed contracts are a recurring
// definition, not a dated transaction, so each one's contribution is computed by
// computeContractContribution: count the real payments due in the window when the window is at
// least one cycle long (bounded windows forecast the whole window; OPEN counts up to today), or
// amortize a proportional slice when the cycle is longer than the window. A null window bound
// means unbounded (OPEN budgets sum all-time). Overlapping selectors are summed naively (see the
// UI overlap hint).

export type BudgetMemberIds = {
  itemCategoryIds: number[];
  supplierCategoryIds: number[];
  supplierIds: number[];
  contractCategoryIds: number[];
  // Cross-cutting Tag selectors: any bill/item/contract carrying one of these tags counts toward
  // the budget regardless of its category.
  tagIds: number[];
};

// A Prisma date filter for [start, end); omit a bound when null (unbounded).
function dateFilter(start: Date | null, end: Date | null): {gte?: Date; lt?: Date} | undefined {
  if (start == null && end == null) return undefined;
  const filter: {gte?: Date; lt?: Date} = {};
  if (start != null) filter.gte = start;
  if (end != null) filter.lt = end;
  return filter;
}

// The contract fields computeContractContribution needs (dates + frequency), selected by both the
// category and the tag contract queries.
const CONTRACT_SELECT = {
  startDate: true,
  endDate: true,
  totalAmount: true,
  frequency: {select: {value: true, isRecurring: true}},
} as const;

// A budget belongs to one account (Phase 14), so its actuals count only that account's spend —
// bills/items and contracts are constrained to the budget's workspaceId. `windowMonths` (from
// windowMonthsFor) and `now` drive the contract count/amortize/forecast logic.
export async function computeActuals(
  members: BudgetMemberIds,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
): Promise<number> {
  const dateInWindow = dateFilter(start, end);
  // Window-overlap filter shared by the contract queries (a Contract is a recurring definition, not
  // a dated transaction, so it counts if its active span overlaps the window).
  const contractOverlap = {
    ...(end != null ? {startDate: {lt: end}} : {}),
    ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
  };

  const [itemAgg, supplierAgg, supplierCatAgg, contracts, tagBillAgg, tagItemAgg, tagContracts] = await Promise.all([
    members.itemCategoryIds.length
      ? client.item.aggregate({
          _sum: {totalPrice: true},
          where: {categoryId: {in: members.itemCategoryIds}, bill: {date: dateInWindow, workspaceId}},
        })
      : null,
    members.supplierIds.length
      ? client.bill.aggregate({
          _sum: {totalAmount: true},
          where: {supplierId: {in: members.supplierIds}, date: dateInWindow, workspaceId},
        })
      : null,
    members.supplierCategoryIds.length
      ? client.bill.aggregate({
          _sum: {totalAmount: true},
          where: {supplier: {categoryId: {in: members.supplierCategoryIds}}, date: dateInWindow, workspaceId},
        })
      : null,
    members.contractCategoryIds.length
      ? client.contract.findMany({
          where: {categoryId: {in: members.contractCategoryIds}, workspaceId, ...contractOverlap},
          select: CONTRACT_SELECT,
        })
      : [],
    // Tag selectors sum the full amount of tagged bills, the line total of tagged items, and the
    // per-window contribution of tagged contracts — mirroring the category selectors but keyed on tags.
    members.tagIds.length
      ? client.bill.aggregate({
          _sum: {totalAmount: true},
          where: {tags: {some: {tagId: {in: members.tagIds}}}, date: dateInWindow, workspaceId},
        })
      : null,
    members.tagIds.length
      ? client.item.aggregate({
          _sum: {totalPrice: true},
          where: {tags: {some: {tagId: {in: members.tagIds}}}, bill: {date: dateInWindow, workspaceId}},
        })
      : null,
    members.tagIds.length
      ? client.contract.findMany({
          where: {tags: {some: {tagId: {in: members.tagIds}}}, workspaceId, ...contractOverlap},
          select: CONTRACT_SELECT,
        })
      : [],
  ]);

  type ContractRow = {
    startDate: Date;
    endDate: Date | null;
    totalAmount: unknown;
    frequency: {value: number; isRecurring: boolean};
  };
  const sumContracts = (rows: ContractRow[]): number =>
    rows.reduce(
      (sum, c) =>
        sum +
        computeContractContribution(
          {
            startDate: c.startDate,
            endDate: c.endDate,
            totalAmount: Number(c.totalAmount),
            frequencyValue: c.frequency.value,
            isRecurring: c.frequency.isRecurring,
          },
          {start, end},
          windowMonths,
          now,
        ),
      0,
    );

  const itemTotal = Number(itemAgg?._sum.totalPrice ?? 0);
  const supplierTotal = Number(supplierAgg?._sum.totalAmount ?? 0);
  const supplierCatTotal = Number(supplierCatAgg?._sum.totalAmount ?? 0);
  const contractTotal = sumContracts(contracts);
  const tagBillTotal = Number(tagBillAgg?._sum.totalAmount ?? 0);
  const tagItemTotal = Number(tagItemAgg?._sum.totalPrice ?? 0);
  const tagContractTotal = sumContracts(tagContracts);

  return (
    itemTotal +
    supplierTotal +
    supplierCatTotal +
    contractTotal +
    tagBillTotal +
    tagItemTotal +
    tagContractTotal
  );
}
