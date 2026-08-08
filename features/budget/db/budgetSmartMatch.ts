import {client} from "@/lib/prisma";
import {computeContractContribution} from "@/features/budget/period";

// "Smart selector" matcher (V4). Selectors split by role:
//
//   BASE (ORed) — item categories and contract categories. An expense is EITHER a variable line OR a
//     fixed contract, so these two never intersect and are unioned. Pick only article categories →
//     contracts drop out; pick only contract categories → variable drops out; pick both, or neither,
//     → both domains are in scope.
//
//   REFINERS (ANDed) — supplier category, supplier, tag. Each is an AND constraint applied on top of
//     the base, on BOTH domains. Within one selector the values are ORed.
//
// Two rules that surprised earlier versions, both handled here:
//
//   • The variable domain is always measured at the LINE ITEM (item.totalPrice), never the whole
//     bill. A tag on one €39.66 line counts €39.66, not the €83.78 bill. Tag cascade still holds: a
//     tag on the BILL matches every line in it. (Safe because every bill's items sum to its total
//     and no bill is item-less in this data.)
//
//   • Selecting EVERY available value of a selector means "no constraint" — otherwise a budget that
//     picks all tags would still exclude every untagged row. So a fully-selected selector is
//     normalized to empty before matching (see normalizeAllSelected). A budget that selected nothing
//     at all still matches nothing.

export type FacetGroup = {
  itemCategoryIds: number[];
  supplierCategoryIds: number[];
  supplierIds: number[];
  contractCategoryIds: number[];
  tagIds: number[];
};

// Total available values per selector, used to detect "all selected" (⇒ unconstrained).
export type SelectorTotals = {
  itemCategories: number;
  contractCategories: number;
  supplierCategories: number;
  suppliers: number;
  tags: number;
};

export async function getSelectorTotals(): Promise<SelectorTotals> {
  const [itemCategories, contractCategories, supplierCategories, suppliers, tags] = await Promise.all([
    client.itemCategory.count(),
    client.contractCategory.count(),
    client.supplierCategory.count(),
    client.supplier.count(),
    client.tag.count(),
  ]);
  return {itemCategories, contractCategories, supplierCategories, suppliers, tags};
}

// A selector holding every available value imposes no constraint → normalize it to empty.
export function normalizeAllSelected(g: FacetGroup, totals: SelectorTotals): FacetGroup {
  const drop = (sel: number[], total: number) => (total > 0 && sel.length >= total ? [] : sel);
  return {
    itemCategoryIds: drop(g.itemCategoryIds, totals.itemCategories),
    contractCategoryIds: drop(g.contractCategoryIds, totals.contractCategories),
    supplierCategoryIds: drop(g.supplierCategoryIds, totals.supplierCategories),
    supplierIds: drop(g.supplierIds, totals.suppliers),
    tagIds: drop(g.tagIds, totals.tags),
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

// Which domains are in scope, from the (normalized) base. Neither base selected → both domains
// (refiners, if any, define the budget; none → all spend); one base selected → only that domain.
export function activeDomains(g: FacetGroup): {variable: boolean; contract: boolean} {
  const bothEmpty = g.itemCategoryIds.length === 0 && g.contractCategoryIds.length === 0;
  return {
    variable: g.itemCategoryIds.length > 0 || bothEmpty,
    contract: g.contractCategoryIds.length > 0 || bothEmpty,
  };
}

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

// ITEM `where` for the variable domain — always item-granular. Applies the base item-category filter
// (if any) and the refiners: supplier / supplier-category (on the parent bill) and tag (line OR bill
// — cascade). Empty facets impose no constraint, so an all-empty group matches every line.
export function variableItemWhere(g: FacetGroup, dateInWindow: object | undefined, workspaceId: number): object {
  const bill: Record<string, unknown> = {workspaceId};
  if (dateInWindow) bill.date = dateInWindow;
  if (g.supplierIds.length) bill.supplierId = {in: g.supplierIds};
  if (g.supplierCategoryIds.length) bill.supplier = {categoryId: {in: g.supplierCategoryIds}};
  return {
    bill,
    ...(g.itemCategoryIds.length ? {categoryId: {in: g.itemCategoryIds}} : {}),
    ...(g.tagIds.length
      ? {OR: [{tags: {some: {tagId: {in: g.tagIds}}}}, {bill: {tags: {some: {tagId: {in: g.tagIds}}}}}]}
      : {}),
  };
}

// CONTRACT `where`: base contract-category (if any) AND-refined by supplier / supplier-category (on
// the contract's supplier) and tag. Empty facets impose no constraint.
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

// Actual spend under the smart model. `gRaw` is the budget's raw selectors; it is normalized here so
// callers don't have to. Returns 0 for a budget with no selectors at all.
export async function computeSmartTotal(
  gRaw: FacetGroup,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
  totals: SelectorTotals,
): Promise<number> {
  if (!hasAnySelector(gRaw)) return 0; // an empty budget counts nothing
  const g = normalizeAllSelected(gRaw, totals);

  const dateInWindow = start || end ? {...(start ? {gte: start} : {}), ...(end ? {lt: end} : {})} : undefined;
  const contractOverlap = {
    ...(end != null ? {startDate: {lt: end}} : {}),
    ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
  };
  const {variable, contract} = activeDomains(g);

  const itemWhere = variable ? variableItemWhere(g, dateInWindow, workspaceId) : null;
  const contractWhere = contract ? contractWhereSmart(g, contractOverlap, workspaceId) : null;

  const [itemAgg, contracts] = await Promise.all([
    itemWhere ? client.item.aggregate({_sum: {totalPrice: true}, where: itemWhere}) : null,
    contractWhere ? client.contract.findMany({where: contractWhere, select: CONTRACT_SELECT}) : [],
  ]);

  return Number(itemAgg?._sum.totalPrice ?? 0) + sumContracts(contracts, start, end, windowMonths, now);
}
