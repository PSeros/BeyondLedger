import {client} from "@/lib/prisma";

// Actual spend for a budget over a time window, summed across all four member selector types.
// Variable selectors sum dated bills/items in the window; fixed contracts are monthly-ized
// (totalAmount × frequency.value ÷ 12) and pro-rated by how many months the window spans, since a
// Contract is a recurring definition, not a dated transaction. A null window bound means
// unbounded (OPEN budgets sum all-time). Overlapping selectors are summed naively (see the UI
// overlap hint).

export type BudgetMemberIds = {
  itemCategoryIds: number[];
  supplierCategoryIds: number[];
  supplierIds: number[];
  contractCategoryIds: number[];
};

// A Prisma date filter for [start, end); omit a bound when null (unbounded).
function dateFilter(start: Date | null, end: Date | null): {gte?: Date; lt?: Date} | undefined {
  if (start == null && end == null) return undefined;
  const filter: {gte?: Date; lt?: Date} = {};
  if (start != null) filter.gte = start;
  if (end != null) filter.lt = end;
  return filter;
}

// How many months the window spans, for pro-rating monthly-ized contract cost. Unbounded windows
// (OPEN) can't be pro-rated meaningfully, so contracts contribute one month there.
function monthsInWindow(start: Date | null, end: Date | null): number {
  if (start == null || end == null) return 1;
  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());
  return Math.max(1, months);
}

// A budget belongs to one account (Phase 14), so its actuals count only that account's spend —
// bills/items and contracts are constrained to the budget's workspaceId.
export async function computeActuals(
  members: BudgetMemberIds,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
): Promise<number> {
  const dateInWindow = dateFilter(start, end);

  const [itemAgg, supplierAgg, supplierCatAgg, contracts] = await Promise.all([
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
          where: {
            categoryId: {in: members.contractCategoryIds},
            workspaceId,
            ...(end != null ? {startDate: {lt: end}} : {}),
            ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
          },
          select: {totalAmount: true, frequency: {select: {value: true}}},
        })
      : [],
  ]);

  const months = monthsInWindow(start, end);
  const itemTotal = Number(itemAgg?._sum.totalPrice ?? 0);
  const supplierTotal = Number(supplierAgg?._sum.totalAmount ?? 0);
  const supplierCatTotal = Number(supplierCatAgg?._sum.totalAmount ?? 0);
  const contractTotal = contracts.reduce(
    (sum, contract) => sum + ((Number(contract.totalAmount) * contract.frequency.value) / 12) * months,
    0,
  );

  return itemTotal + supplierTotal + supplierCatTotal + contractTotal;
}
