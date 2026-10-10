import {addDays, dateKey, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import type {InsightsRow} from "@/features/insights/db/insightsRows";
import type {StatKey, StatUnit} from "@/features/insights/params";

// Pure stats over Insights rows. Calculated in TS because SQLite has no stddev/percentiles, and the
// row counts here are personal-finance sized.

export type StatValues = Record<StatKey, number | null>;

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function computeStats(samples: number[]): StatValues {
  const count = samples.length;
  if (!count) {
    return {count: 0, sum: 0, mean: null, median: null, min: null, max: null, stdDev: null, variance: null, p90: null};
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = samples.reduce((acc, value) => acc + value, 0);
  const mean = sum / count;
  // Sample variance (n − 1); undefined for a single sample.
  const variance = count > 1 ? samples.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (count - 1) : null;
  return {
    count,
    sum,
    mean,
    median: quantile(sorted, 0.5),
    min: sorted[0],
    max: sorted[count - 1],
    stdDev: variance == null ? null : Math.sqrt(variance),
    variance,
    p90: quantile(sorted, 0.9),
  };
}

// Monday of the ISO week containing `date`.
function weekStart(date: Date): Date {
  return addDays(date, -((date.getUTCDay() + 6) % 7));
}

export type TimeUnit = "day" | "week" | "month" | "year";

function bucketKey(day: string, unit: TimeUnit): string {
  if (unit === "day") return day;
  if (unit === "year") return day.slice(0, 4);
  if (unit === "month") return day.slice(0, 7);
  return dateKey(weekStart(new Date(`${day}T00:00:00Z`)));
}

function bucketStart(date: Date, unit: TimeUnit): Date {
  if (unit === "week") return weekStart(date);
  if (unit === "month") return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
  if (unit === "year") return utcDate(date.getUTCFullYear(), 0, 1);
  return date;
}

function nextBucket(date: Date, unit: TimeUnit): Date {
  if (unit === "day") return addDays(date, 1);
  if (unit === "week") return addDays(date, 7);
  if (unit === "month") return utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return utcDate(date.getUTCFullYear() + 1, 0, 1);
}

// Totals per bucket for every bucket touching [start, end), in order; empty buckets are 0. Keys are
// the bucket's first day (yyyy-mm-dd) for day/week, yyyy-mm for month, yyyy for year.
export function bucketTotals(rows: InsightsRow[], unit: TimeUnit, span: {start: Date; end: Date}): Map<string, number> {
  const totals = new Map<string, number>();
  for (let cursor = bucketStart(span.start, unit); cursor < span.end; cursor = nextBucket(cursor, unit)) {
    totals.set(bucketKey(dateKey(cursor), unit), 0);
  }
  for (const row of rows) {
    const key = bucketKey(row.date, unit);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return totals;
}

// The chart's bucket size for a span: about 6–40 bars.
export function chartUnitFor(span: {start: Date; end: Date}): TimeUnit {
  const days = (span.end.getTime() - span.start.getTime()) / 86_400_000;
  if (days <= 31) return "day";
  if (days <= 190) return "week";
  if (days <= 366 * 4) return "month";
  return "year";
}

// Turns rows into the samples for `unit`. `span` bounds the zero-filled time buckets.
export function samplesFor(rows: InsightsRow[], unit: StatUnit, span: {start: Date; end: Date}): number[] {
  if (unit === "item") return rows.map((row) => row.amount);
  if (unit === "bill") {
    const bills = new Map<number, number>();
    const others: number[] = [];
    for (const row of rows) {
      if (row.billId == null) others.push(row.amount);
      else bills.set(row.billId, (bills.get(row.billId) ?? 0) + row.amount);
    }
    return [...bills.values(), ...others];
  }
  return [...bucketTotals(rows, unit, span).values()];
}

export type BreakdownRow = {label: string; amount: number; count: number; isOther: boolean; isUntagged: boolean};

const UNTAGGED = "\u0000untagged";
const OTHER = "\u0000other";

// Totals per category / counterparty / tag, biggest first, folded to `max` bars plus "Other". An
// entry with several tags counts once per tag, so tag bars can sum to more than the total. Groups
// netting to ≤ 0 (bottle-deposit returns) have no share to draw and are dropped.
export function breakdown(rows: InsightsRow[], by: "category" | "counterparty" | "tag", max = 10): BreakdownRow[] {
  const groups = new Map<string, {amount: number; count: number}>();
  const add = (key: string, amount: number) => {
    const group = groups.get(key) ?? {amount: 0, count: 0};
    group.amount += amount;
    group.count += 1;
    groups.set(key, group);
  };
  for (const row of rows) {
    if (by === "tag") {
      if (row.tags.length === 0) add(UNTAGGED, row.amount);
      else for (const tag of row.tags) add(tag, row.amount);
    } else {
      add(by === "category" ? row.category : row.counterparty, row.amount);
    }
  }
  const sorted = [...groups.entries()]
    .filter(([, group]) => group.amount > 0)
    .sort((a, b) => b[1].amount - a[1].amount);
  const kept = sorted.length > max + 1 ? sorted.slice(0, max) : sorted;
  const rest = sorted.slice(kept.length);
  if (rest.length) {
    kept.push([OTHER, rest.reduce((acc, [, group]) => ({amount: acc.amount + group.amount, count: acc.count + group.count}), {amount: 0, count: 0})]);
  }
  return kept.map(([key, group]) => ({
    label: key === UNTAGGED || key === OTHER ? "" : key,
    amount: group.amount,
    count: group.count,
    isOther: key === OTHER,
    isUntagged: key === UNTAGGED,
  }));
}
