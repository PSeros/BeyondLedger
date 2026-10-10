import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {parseMonthAnchor, resolveActivePeriod} from "@/features/budget/period";
import type {InsightsWindow} from "@/features/insights/params";

export type ResolvedWindow = {start: Date | null; end: Date | null}; // [start, end), null = unbounded

// Resolved exactly like a budget period containing the anchor month.
export function resolveWindow(window: InsightsWindow): ResolvedWindow {
  const {start, end} = resolveActivePeriod(
    {periodType: window.periodType, anchorMonth: window.month, startDate: window.from, endDate: window.to},
    parseMonthAnchor(window.anchor),
  );
  return {start, end};
}

// Contracts and income only count payments that already happened: the window is capped at today.
export function realizedBounds(window: ResolvedWindow, now: Date = new Date()): {start: Date; end: Date} {
  const tomorrow = addDays(utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()), 1);
  return {
    start: window.start ?? new Date(0),
    end: window.end && window.end < tomorrow ? window.end : tomorrow,
  };
}

// Step the anchor by one period; RANGE and OPEN don't step.
export function stepAnchor(window: InsightsWindow, delta: -1 | 1): string | null {
  const months = {MONTHLY: 1, QUARTERLY: 3, YEARLY: 12, MONTH_OF_YEAR: 12, RANGE: 0, OPEN: 0}[window.periodType];
  if (!months) return null;
  const anchor = parseMonthAnchor(window.anchor);
  const next = utcDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta * months, 1);
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}
