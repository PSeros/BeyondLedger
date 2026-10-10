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

function bucketKey(day: string, unit: "day" | "week" | "month"): string {
  if (unit === "day") return day;
  if (unit === "month") return day.slice(0, 7);
  return dateKey(weekStart(new Date(`${day}T00:00:00Z`)));
}

// Every bucket touching [start, end), so empty days/weeks/months become 0 samples.
function allBuckets(start: Date, end: Date, unit: "day" | "week" | "month"): string[] {
  const keys: string[] = [];
  let cursor = unit === "week" ? weekStart(start) : unit === "month" ? utcDate(start.getUTCFullYear(), start.getUTCMonth(), 1) : start;
  while (cursor < end) {
    keys.push(bucketKey(dateKey(cursor), unit));
    cursor = unit === "day" ? addDays(cursor, 1) : unit === "week" ? addDays(cursor, 7) : utcDate(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1);
  }
  return keys;
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
  const totals = new Map(allBuckets(span.start, span.end, unit).map((key) => [key, 0]));
  for (const row of rows) {
    const key = bucketKey(row.date, unit);
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + row.amount);
  }
  return [...totals.values()];
}
