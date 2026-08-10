import {computeSmartTotal, type FacetSelection, type SelectorTotals} from "@/features/budget/db/budgetSmartMatch";

// Actual spend for a budget over a time window.
//
// MATCH MODEL: "smart selector". Included item/contract categories form an ORed base (they're
// mutually exclusive domains); included supplier category, supplier and tag are ANDed refiners
// applied on top, across both domains. EXCLUDED values are a global AND-NOT on top of all of that.
// The variable domain is measured per line item, and a fully-included selector is treated as
// unconstrained. See budgetSmartMatch.ts for the full rules and the tag cascade.

export type BudgetMemberIds = FacetSelection;

// A budget belongs to one account (Phase 14), so its actuals count only that account's spend.
// `windowMonths` (from windowMonthsFor) and `now` drive the contract count/amortize/forecast logic.
// `totals` (from getSelectorTotals) lets the matcher treat "all values included" as no constraint.
export async function computeActuals(
  members: BudgetMemberIds,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
  totals: SelectorTotals,
): Promise<number> {
  return computeSmartTotal(members, start, end, workspaceId, windowMonths, now, totals);
}
