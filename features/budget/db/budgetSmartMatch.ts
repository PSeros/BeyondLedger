import {client} from "@/lib/prisma";
import {computeContractContribution} from "@/features/budget/period";

// "Smart selector" matcher (V4 prototype). Selectors split by role:
//
//   BASE (ORed) — item categories and contract categories. Because an expense is EITHER a variable
//     line OR a fixed contract, these two never intersect, so they're unioned. Pick only article
//     categories → contracts don't count; pick only contract categories → variable doesn't count;
//     pick both → both count; pick neither → the base is "all spend".
//
//   REFINERS (ANDed) — supplier category, supplier, tag. Each is an AND constraint applied on top of
//     the base, on BOTH domains (bills and contracts each have a supplier + tags). Within one
//     selector the values are ORed ("REWE or Aldi").
//
// So "Food + REWE + Vacation" = Food lines, from REWE, tagged Vacation (no contracts). "REWE +
// Vacation" alone = every REWE bill and REWE contract tagged Vacation. Tag cascade: a bill's tag
// counts for all its lines.

export type FacetGroup = {
  itemCategoryIds: number[];
  supplierCategoryIds: number[];
  supplierIds: number[];
  contractCategoryIds: number[];
  tagIds: number[];
};

const CONTRACT_SELECT = {
  startDate: true,
  endDate: true,
  totalAmount: true,
  frequency: {select: {value: true, isRecurring: true}},
} as const;

type ContractRow = {
  startDate: Date;
  endDate: Date | null;
  totalAmount: unknown;
  frequency: {value: number; isRecurring: boolean};
};

function sumContracts(rows: ContractRow[], start: Date | null, end: Date | null, windowMonths: number, now: Date): number {
  return rows.reduce(
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
}

// Which domains the base activates. Neither base selected → both domains active (refiners define the
// budget); one base selected → only that domain; both → both.
export function activeDomains(g: FacetGroup): {variable: boolean; contract: boolean} {
  const bothEmpty = g.itemCategoryIds.length === 0 && g.contractCategoryIds.length === 0;
  return {
    variable: g.itemCategoryIds.length > 0 || bothEmpty,
    contract: g.contractCategoryIds.length > 0 || bothEmpty,
  };
}

export function hasAnySelector(g: FacetGroup): boolean {
  return (
    g.itemCategoryIds.length > 0 ||
    g.contractCategoryIds.length > 0 ||
    g.supplierCategoryIds.length > 0 ||
    g.supplierIds.length > 0 ||
    g.tagIds.length > 0
  );
}

// ITEM `where` for the variable base when item categories ARE selected: lines in those categories,
// AND-refined by supplier / supplier-category (on the parent bill) and tag (line or bill — cascade).
export function itemWhereSmart(g: FacetGroup, dateInWindow: object | undefined, workspaceId: number): object {
  const bill: Record<string, unknown> = {workspaceId};
  if (dateInWindow) bill.date = dateInWindow;
  if (g.supplierIds.length) bill.supplierId = {in: g.supplierIds};
  if (g.supplierCategoryIds.length) bill.supplier = {categoryId: {in: g.supplierCategoryIds}};
  return {
    categoryId: {in: g.itemCategoryIds},
    bill,
    ...(g.tagIds.length
      ? {OR: [{tags: {some: {tagId: {in: g.tagIds}}}}, {bill: {tags: {some: {tagId: {in: g.tagIds}}}}}]}
      : {}),
  };
}

// BILL `where` for the variable base when NO item category is selected (base = all bills), refined
// by supplier / supplier-category / tag (bill or any line — cascade).
export function billWhereSmart(g: FacetGroup, dateInWindow: object | undefined, workspaceId: number): object {
  const where: Record<string, unknown> = {workspaceId};
  if (dateInWindow) where.date = dateInWindow;
  if (g.supplierIds.length) where.supplierId = {in: g.supplierIds};
  if (g.supplierCategoryIds.length) where.supplier = {categoryId: {in: g.supplierCategoryIds}};
  if (g.tagIds.length) {
    where.OR = [
      {tags: {some: {tagId: {in: g.tagIds}}}},
      {items: {some: {tags: {some: {tagId: {in: g.tagIds}}}}}},
    ];
  }
  return where;
}

// CONTRACT `where`: base (contract category, if any) AND-refined by supplier / supplier-category (on
// the contract's supplier) and tag (on the contract).
export function contractWhereSmart(g: FacetGroup, contractOverlap: object, workspaceId: number): object {
  return {
    workspaceId,
    ...contractOverlap,
    ...(g.contractCategoryIds.length ? {categoryId: {in: g.contractCategoryIds}} : {}),
    ...(g.supplierIds.length ? {supplierId: {in: g.supplierIds}} : {}),
    ...(g.supplierCategoryIds.length ? {supplier: {categoryId: {in: g.supplierCategoryIds}}} : {}),
    ...(g.tagIds.length ? {tags: {some: {tagId: {in: g.tagIds}}}} : {}),
  };
}

// Actual spend under the smart model: variable domain (items or bills) + contract domain, unioned.
export async function computeSmartTotal(
  g: FacetGroup,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
): Promise<number> {
  if (!hasAnySelector(g)) return 0; // nothing selected → nothing counts
  const dateInWindow = start || end ? {...(start ? {gte: start} : {}), ...(end ? {lt: end} : {})} : undefined;
  const contractOverlap = {
    ...(end != null ? {startDate: {lt: end}} : {}),
    ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
  };
  const {variable, contract} = activeDomains(g);

  // Variable domain: item-level when an item category is picked, else bill-level.
  const itemWhere = variable && g.itemCategoryIds.length > 0 ? itemWhereSmart(g, dateInWindow, workspaceId) : null;
  const billWhere = variable && g.itemCategoryIds.length === 0 ? billWhereSmart(g, dateInWindow, workspaceId) : null;
  const contractWhere = contract ? contractWhereSmart(g, contractOverlap, workspaceId) : null;

  const [itemAgg, billAgg, contracts] = await Promise.all([
    itemWhere ? client.item.aggregate({_sum: {totalPrice: true}, where: itemWhere}) : null,
    billWhere ? client.bill.aggregate({_sum: {totalAmount: true}, where: billWhere}) : null,
    contractWhere ? client.contract.findMany({where: contractWhere, select: CONTRACT_SELECT}) : [],
  ]);

  return (
    Number(itemAgg?._sum.totalPrice ?? 0) +
    Number(billAgg?._sum.totalAmount ?? 0) +
    sumContracts(contracts, start, end, windowMonths, now)
  );
}
