import {client} from "@/lib/prisma";
import {computeContractContribution} from "@/features/budget/period";

// "Smart selector" matcher (V5). Every selector value is either INCLUDED or EXCLUDED.
//
// INCLUDES split by role:
//
//   BASE (ORed) — item categories and contract categories. An expense is EITHER a variable line OR a
//     fixed contract, so these two never intersect and are unioned. Pick only article categories →
//     contracts drop out; pick only contract categories → variable drops out; pick both, or neither,
//     → both domains are in scope.
//
//   REFINERS (ANDed) — supplier category, supplier, tag. Each is an AND constraint applied on top of
//     the base, on BOTH domains. Within one selector the values are ORed.
//
// EXCLUDES are role-free: an excluded value is a global AND-NOT. Anything matching ANY exclusion is
// dropped from both domains, whatever the includes said. That's what lets a "Food & Drink" budget
// own the article categories while carving out the Restaurant supplier category for a sibling
// "Restaurant" budget. An exclusion only bites on the domain it can address (an excluded article
// category is meaningless to a contract, and vice versa) — it never narrows the other one.
// Excludes alone are a valid budget: "everything except X".
//
// Two rules that surprised earlier versions, both still handled here:
//
//   • The variable domain is always measured at the LINE ITEM (item.totalPrice), never the whole
//     bill. A tag on one €39.66 line counts €39.66, not the €83.78 bill. Tag cascade still holds: a
//     tag on the BILL matches every line in it — and symmetrically, an excluded tag on the bill
//     drops every line in it. (Safe because every bill's items sum to its total and no bill is
//     item-less in this data.)
//
//   • Selecting EVERY available value of a selector means "no constraint" — otherwise a budget that
//     picks all tags would still exclude every untagged row. So a fully-INCLUDED selector is
//     normalized to empty before matching (see normalizeAllSelected). Exclusions are never
//     normalized away: they are always meant literally. A budget that selected nothing at all still
//     matches nothing.

export type FacetGroup = {
  itemCategoryIds: number[];
  supplierCategoryIds: number[];
  supplierIds: number[];
  contractCategoryIds: number[];
  tagIds: number[];
};

// A budget's selectors, split by sign. The two sides are disjoint: one value is included or
// excluded, never both.
export type FacetSelection = {include: FacetGroup; exclude: FacetGroup};

export const EMPTY_FACET_GROUP: FacetGroup = {
  itemCategoryIds: [],
  supplierCategoryIds: [],
  supplierIds: [],
  contractCategoryIds: [],
  tagIds: [],
};

// One BudgetMember row, as far as matching cares: which selector it points at, and its sign.
export type BudgetMemberRow = {
  itemCategoryId: number | null;
  supplierCategoryId: number | null;
  supplierId: number | null;
  contractCategoryId: number | null;
  tagId: number | null;
  isExcluded: boolean;
};

// Fold the polymorphic member rows into the two-sided selection the matcher works with.
export function facetSelectionFromMembers(rows: BudgetMemberRow[]): FacetSelection {
  const build = (isExcluded: boolean): FacetGroup => {
    const side = rows.filter((row) => row.isExcluded === isExcluded);
    const ids = (pick: (row: BudgetMemberRow) => number | null): number[] =>
      side.map(pick).filter((id): id is number => id != null);
    return {
      itemCategoryIds: ids((row) => row.itemCategoryId),
      supplierCategoryIds: ids((row) => row.supplierCategoryId),
      supplierIds: ids((row) => row.supplierId),
      contractCategoryIds: ids((row) => row.contractCategoryId),
      tagIds: ids((row) => row.tagId),
    };
  };
  return {include: build(false), exclude: build(true)};
}

// Total available values per selector, used to detect "all included" (⇒ unconstrained).
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

// An INCLUDE selector holding every available value imposes no constraint → normalize it to empty.
// Excludes pass through untouched.
export function normalizeAllSelected(sel: FacetSelection, totals: SelectorTotals): FacetSelection {
  const drop = (values: number[], total: number) => (total > 0 && values.length >= total ? [] : values);
  return {
    include: {
      itemCategoryIds: drop(sel.include.itemCategoryIds, totals.itemCategories),
      contractCategoryIds: drop(sel.include.contractCategoryIds, totals.contractCategories),
      supplierCategoryIds: drop(sel.include.supplierCategoryIds, totals.supplierCategories),
      supplierIds: drop(sel.include.supplierIds, totals.suppliers),
      tagIds: drop(sel.include.tagIds, totals.tags),
    },
    exclude: sel.exclude,
  };
}

function groupIsEmpty(g: FacetGroup): boolean {
  return (
    g.itemCategoryIds.length === 0 &&
    g.supplierCategoryIds.length === 0 &&
    g.supplierIds.length === 0 &&
    g.contractCategoryIds.length === 0 &&
    g.tagIds.length === 0
  );
}

export function hasAnySelector(sel: FacetSelection): boolean {
  return !groupIsEmpty(sel.include) || !groupIsEmpty(sel.exclude);
}

// Which domains are in scope, from the (normalized) INCLUDE base. Neither base included → both
// domains (refiners, if any, define the budget; none → all spend); one base included → only that
// domain. Exclusions never decide scope — they only carve out of it.
export function activeDomains(sel: FacetSelection): {variable: boolean; contract: boolean} {
  const {itemCategoryIds, contractCategoryIds} = sel.include;
  const bothEmpty = itemCategoryIds.length === 0 && contractCategoryIds.length === 0;
  return {
    variable: itemCategoryIds.length > 0 || bothEmpty,
    contract: contractCategoryIds.length > 0 || bothEmpty,
  };
}

// The exclusion branches for one domain, ORed: matching ANY of them drops the row. Returns null when
// nothing is excluded, so callers can omit the NOT entirely.
function excludeOr(branches: object[]): {NOT: {OR: object[]}} | null {
  return branches.length ? {NOT: {OR: branches}} : null;
}

// Exclusions expressed relative to an ITEM. Excluded contract categories say nothing about a line.
function itemExclusions(ex: FacetGroup): {NOT: {OR: object[]}} | null {
  const branches: object[] = [];
  if (ex.itemCategoryIds.length) branches.push({categoryId: {in: ex.itemCategoryIds}});
  if (ex.supplierIds.length) branches.push({bill: {supplierId: {in: ex.supplierIds}}});
  if (ex.supplierCategoryIds.length) branches.push({bill: {supplier: {categoryId: {in: ex.supplierCategoryIds}}}});
  if (ex.tagIds.length) {
    // Tag cascade, negated: an excluded tag on the line OR on its bill drops the line.
    branches.push({tags: {some: {tagId: {in: ex.tagIds}}}});
    branches.push({bill: {tags: {some: {tagId: {in: ex.tagIds}}}}});
  }
  return excludeOr(branches);
}

// Exclusions expressed relative to a CONTRACT. Excluded article categories say nothing about one.
function contractExclusions(ex: FacetGroup): {NOT: {OR: object[]}} | null {
  const branches: object[] = [];
  if (ex.contractCategoryIds.length) branches.push({categoryId: {in: ex.contractCategoryIds}});
  if (ex.supplierIds.length) branches.push({supplierId: {in: ex.supplierIds}});
  if (ex.supplierCategoryIds.length) branches.push({supplier: {categoryId: {in: ex.supplierCategoryIds}}});
  if (ex.tagIds.length) branches.push({tags: {some: {tagId: {in: ex.tagIds}}}});
  return excludeOr(branches);
}

// The item-level half of the variable predicate: the base item-category include, the tag include
// (line OR bill — cascade), and every exclusion that can address a line. Carries no workspace/date
// scoping, so it also drops straight into a `bill.items.some` (see billsWithMatchingItem).
export function itemFacetWhere(sel: FacetSelection): object {
  const {include, exclude} = sel;
  return {
    ...(include.itemCategoryIds.length ? {categoryId: {in: include.itemCategoryIds}} : {}),
    ...(include.tagIds.length
      ? {OR: [{tags: {some: {tagId: {in: include.tagIds}}}}, {bill: {tags: {some: {tagId: {in: include.tagIds}}}}}]}
      : {}),
    ...(itemExclusions(exclude) ?? {}),
  };
}

// The bill-level half: workspace + window scoping plus the supplier / supplier-category INCLUDE
// refiners. Supplier exclusions are NOT applied here — they ride along in itemFacetWhere, so a bill
// only loses the lines they hit rather than being dropped whole. (Same outcome for a supplier-level
// exclusion, but it keeps one code path.)
export function billScopeWhere(sel: FacetSelection, dateInWindow: object | undefined, workspaceId: number): Record<string, unknown> {
  const where: Record<string, unknown> = {workspaceId};
  if (dateInWindow) where.date = dateInWindow;
  if (sel.include.supplierIds.length) where.supplierId = {in: sel.include.supplierIds};
  if (sel.include.supplierCategoryIds.length) where.supplier = {categoryId: {in: sel.include.supplierCategoryIds}};
  return where;
}

// ITEM `where` for the variable domain — always item-granular. Empty facets impose no constraint, so
// an all-empty selection matches every line.
export function variableItemWhere(sel: FacetSelection, dateInWindow: object | undefined, workspaceId: number): object {
  return {bill: billScopeWhere(sel, dateInWindow, workspaceId), ...itemFacetWhere(sel)};
}

// BILL `where` selecting bills that hold at least one contributing line.
export function billsWithMatchingItem(sel: FacetSelection, dateInWindow: object | undefined, workspaceId: number): object {
  return {...billScopeWhere(sel, dateInWindow, workspaceId), items: {some: itemFacetWhere(sel)}};
}

// CONTRACT `where`: base contract-category include (if any), AND-refined by the supplier /
// supplier-category / tag includes, minus everything the exclusions catch.
export function contractWhereSmart(sel: FacetSelection, contractOverlap: object, workspaceId: number): object {
  const {include, exclude} = sel;
  return {
    workspaceId,
    ...contractOverlap,
    ...(include.contractCategoryIds.length ? {categoryId: {in: include.contractCategoryIds}} : {}),
    ...(include.supplierIds.length ? {supplierId: {in: include.supplierIds}} : {}),
    ...(include.supplierCategoryIds.length ? {supplier: {categoryId: {in: include.supplierCategoryIds}}} : {}),
    ...(include.tagIds.length ? {tags: {some: {tagId: {in: include.tagIds}}}} : {}),
    ...(contractExclusions(exclude) ?? {}),
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

// The date bounds shared by both domains: bills are filtered by `date` inside the window, contracts
// by overlap with it.
export function windowFilters(start: Date | null, end: Date | null): {dateInWindow: object | undefined; contractOverlap: object} {
  return {
    dateInWindow: start || end ? {...(start ? {gte: start} : {}), ...(end ? {lt: end} : {})} : undefined,
    contractOverlap: {
      ...(end != null ? {startDate: {lt: end}} : {}),
      ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
    },
  };
}

// Actual spend under the smart model. `selRaw` is the budget's raw selectors; it is normalized here
// so callers don't have to. Returns 0 for a budget with no selectors at all.
export async function computeSmartTotal(
  selRaw: FacetSelection,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
  totals: SelectorTotals,
): Promise<number> {
  if (!hasAnySelector(selRaw)) return 0; // an empty budget counts nothing
  const sel = normalizeAllSelected(selRaw, totals);

  const {dateInWindow, contractOverlap} = windowFilters(start, end);
  const {variable, contract} = activeDomains(sel);

  const itemWhere = variable ? variableItemWhere(sel, dateInWindow, workspaceId) : null;
  const contractWhere = contract ? contractWhereSmart(sel, contractOverlap, workspaceId) : null;

  const [itemAgg, contracts] = await Promise.all([
    itemWhere ? client.item.aggregate({_sum: {totalPrice: true}, where: itemWhere}) : null,
    contractWhere ? client.contract.findMany({where: contractWhere, select: CONTRACT_SELECT}) : [],
  ]);

  return Number(itemAgg?._sum.totalPrice ?? 0) + sumContracts(contracts, start, end, windowMonths, now);
}
