import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {DEFAULT_WINDOW_DAYS, MAX_WINDOW_DAYS, type InsightsWindow} from "@/features/insights/params";

export type ResolvedWindow = {start: Date; end: Date}; // [start, end), UTC midnights

// Rolling presets end with today (inclusive): "last 7 days" = today and the 6 before it. A range is
// inclusive on both ends; an incomplete or inverted one falls back to the default rolling window.
export function resolveWindow(window: InsightsWindow, now: Date = new Date()): ResolvedWindow {
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const end = addDays(today, 1);
  const lastDays = (days: number): ResolvedWindow => ({start: addDays(end, -days), end});

  switch (window.preset) {
    case "days":
      return lastDays(window.days);
    case "range": {
      if (!window.from || !window.to) return lastDays(DEFAULT_WINDOW_DAYS);
      const start = new Date(`${window.from}T00:00:00Z`);
      const rangeEnd = addDays(new Date(`${window.to}T00:00:00Z`), 1);
      if (rangeEnd <= start) return lastDays(DEFAULT_WINDOW_DAYS);
      const capped = addDays(start, MAX_WINDOW_DAYS);
      return {start, end: rangeEnd < capped ? rangeEnd : capped};
    }
    default:
      return lastDays(Number(window.preset));
  }
}
