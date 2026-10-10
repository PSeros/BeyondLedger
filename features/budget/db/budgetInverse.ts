import {client} from "@/lib/prisma";
import {claimWindowsWithin, type PeriodInput, type Window} from "@/features/budget/period";
import {
  activeDomains,
  contractWhereSmart,
  CONTRACT_SELECT,
  hasAnySelector,
  normalizeAllSelected,
  sumContracts,
  variableItemWhere,
  windowFilters,
  type FacetSelection,
  type SelectorTotals,
} from "@/features/budget/db/budgetSmartMatch";

// The inverse ("catch-all") budget: it holds no selectors and counts every expense in its window
// that no OTHER budget of the same account claims.
//
// It is the complement of the smart matcher, built from the very same `where` builders: each other
// budget contributes its own predicate as one branch of a big OR, and the inverse budget asks for
// everything that matches NONE of them. Reusing those builders is the point — a budget's claim here
// is exactly what its own card counts, so the two can't drift.
//
// CLAIMS ARE TIME-SCOPED (see claimWindowsWithin): a RANGE budget only claims inside its span and a
// MONTH_OF_YEAR budget only inside its month, so a vacation-week Restaurant budget stops carving
// restaurants out of the inverse budget for the rest of the year. A claimer with a bounded window
// therefore contributes one branch per overlapping window, each carrying its own date filter.
//
// Three rules worth naming:
//   • Inverse budgets never claim. They are left out of the claim set, so two of them in one account
//     simply show the same number instead of cancelling each other out.
//   • A budget with no selectors at all claims nothing (it counts nothing either), so the inverse
//     budget catches what it leaves behind.
//   • The variable domain is split per line item, exactly like the matcher: the unclaimed lines of a
//     partly-claimed bill land here. Contracts are all-or-nothing — a contract claimed by any other
//     budget is out, with no attempt to split one payment between a claimer and the inverse budget.

// What the inverse budget needs to know about one other budget: its selectors and its period.
export type ClaimSource = PeriodInput & {memberIds: FacetSelection; isInverse: boolean};

export type InverseClaims = {items: object[]; contracts: object[]};

// The claim branches of every budget that competes with the inverse budget over `window`.
export function buildClaims(
  others: ClaimSource[],
  window: Window,
  workspaceId: number,
  totals: SelectorTotals,
): InverseClaims {
  const items: object[] = [];
  const contracts: object[] = [];

  for (const other of others) {
    // An inverse budget claims nothing; neither does a budget without a single selector.
    if (other.isInverse || !hasAnySelector(other.memberIds)) continue;

    const sel = normalizeAllSelected(other.memberIds, totals);
    const {variable, contract} = activeDomains(sel);

    // null = claims everywhere → one branch over the inverse budget's whole window.
    const claimWindows = claimWindowsWithin(other, window) ?? [window];

    for (const claimed of claimWindows) {
      const {dateInWindow, contractOverlap} = windowFilters(claimed.start, claimed.end);
      if (variable) items.push(variableItemWhere(sel, dateInWindow, workspaceId));
      if (contract) contracts.push(contractWhereSmart(sel, contractOverlap, workspaceId));
    }
  }

  return {items, contracts};
}

// The `where` pair for the unclaimed remainder. Shared by the actual and the "view entries" list so
// the number and the list can't disagree.
export function inverseWheres(
  claims: InverseClaims,
  window: Window,
  workspaceId: number,
): {itemWhere: object; contractWhere: object} {
  const {dateInWindow, contractOverlap} = windowFilters(window.start, window.end);
  return {
    itemWhere: {
      bill: {workspaceId, ...(dateInWindow ? {date: dateInWindow} : {})},
      ...(claims.items.length ? {NOT: {OR: claims.items}} : {}),
    },
    contractWhere: {
      workspaceId,
      ...contractOverlap,
      ...(claims.contracts.length ? {NOT: {OR: claims.contracts}} : {}),
    },
  };
}

// Actual spend of an inverse budget: unclaimed line items plus unclaimed contracts, over the same
// window and with the same contract count/amortize rules as every other budget.
export async function computeInverseTotal(
  others: ClaimSource[],
  window: Window,
  workspaceId: number,
  windowMonths: number,
  now: Date,
  totals: SelectorTotals,
): Promise<number> {
  const {itemWhere, contractWhere} = inverseWheres(buildClaims(others, window, workspaceId, totals), window, workspaceId);

  const [itemAgg, contracts] = await Promise.all([
    client.item.aggregate({_sum: {totalPrice: true}, where: itemWhere}),
    client.contract.findMany({where: contractWhere, select: CONTRACT_SELECT}),
  ]);

  return (
    Number(itemAgg._sum.totalPrice ?? 0) + sumContracts(contracts, window.start, window.end, windowMonths, now)
  );
}
