import {computeSmartTotal, type FacetGroup} from "@/features/budget/db/budgetSmartMatch";

// Actual spend for a budget over a time window.
//
// MATCH MODEL (this branch): "smart selector". Item/contract categories form an ORed base (they're
// mutually exclusive domains); supplier category, supplier and tag are ANDed refiners applied on top,
// across both domains. See budgetSmartMatch.ts for the full rules and the tag cascade.

export type BudgetMemberIds = FacetGroup;

// A budget belongs to one account (Phase 14), so its actuals count only that account's spend.
// `windowMonths` (from windowMonthsFor) and `now` drive the contract count/amortize/forecast logic.
export async function computeActuals(
  members: BudgetMemberIds,
  start: Date | null,
  end: Date | null,
  workspaceId: number,
  windowMonths: number,
  now: Date,
): Promise<number> {
  return computeSmartTotal(members, start, end, workspaceId, windowMonths, now);
}
