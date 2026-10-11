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

// The same stretch of the previous period, for "vs. previous" deltas: one period back, cut to as much
// of it as has elapsed of the current one (Oct 1–11 compares with Sep 1–11). A range compares with
// the equally long range right before it; all time has nothing to compare with.
export function previousSpan(window: InsightsWindow, span: {start: Date; end: Date}): {start: Date; end: Date} | null {
  const current = resolveWindow(window);
  if (current.start == null) return null;
  const elapsed = span.end.getTime() - current.start.getTime();
  if (elapsed <= 0) return null;
  if (window.periodType === "RANGE") {
    const length = (current.end?.getTime() ?? span.end.getTime()) - current.start.getTime();
    const start = new Date(current.start.getTime() - length);
    return {start, end: new Date(start.getTime() + Math.min(elapsed, length))};
  }
  const prevAnchor = stepAnchor(window, -1);
  if (!prevAnchor) return null;
  const previous = resolveWindow({...window, anchor: prevAnchor});
  if (previous.start == null || previous.end == null) return null;
  const end = new Date(Math.min(previous.start.getTime() + elapsed, previous.end.getTime()));
  return {start: previous.start, end};
}

// The span the per-period views run over: the period, capped at today; all time starts at the oldest
// row (rows arrive newest first).
// `notBefore` is the app-wide calculation start: empty periods before it don't count as zeros.
export function spanFor(window: ResolvedWindow, rows: {date: string}[], notBefore: Date | null = null): {start: Date; end: Date} {
  const paid = realizedBounds(window);
  const oldest = rows.at(-1);
  const start = window.start ?? (oldest ? new Date(`${oldest.date}T00:00:00Z`) : paid.end);
  return {start: notBefore && notBefore > start ? notBefore : start, end: paid.end};
}
