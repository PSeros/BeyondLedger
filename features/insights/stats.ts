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

export type BoxStats = {
  label: string;
  n: number;
  outOf?: number; // weekday boxes: how many such weekdays the span has (n = the ones with entries)
  mean: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
};

// Box-and-whisker for one group (Tukey: whiskers reach the furthest value within 1.5 × IQR, the rest
// are outliers).
export function boxFrom(label: string, values: number[]): BoxStats {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const fence = 1.5 * (q3 - q1);
  const inside = sorted.filter((v) => v >= q1 - fence && v <= q3 + fence);
  return {
    label,
    n: sorted.length,
    mean: sorted.reduce((sum, v) => sum + v, 0) / sorted.length,
    min: inside[0] ?? sorted[0],
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: inside[inside.length - 1] ?? sorted[sorted.length - 1],
    outliers: sorted.filter((v) => v < q1 - fence || v > q3 + fence),
  };
}

// Single positive amounts per category / counterparty / tag, the `groups` biggest by total. A refund
// line has no place on a spending distribution.
export function boxesByGroup(rows: InsightsRow[], by: "category" | "counterparty" | "tag", groups = 8): BoxStats[] {
  const samples = new Map<string, number[]>();
  for (const row of rows) {
    if (row.amount <= 0) continue;
    const keys = by === "tag" ? row.tags : [by === "category" ? row.category : row.counterparty];
    for (const key of keys) samples.set(key, [...(samples.get(key) ?? []), row.amount]);
  }
  return [...samples.entries()]
    .sort((a, b) => b[1].reduce((s, v) => s + v, 0) - a[1].reduce((s, v) => s + v, 0))
    .slice(0, groups)
    .map(([label, values]) => boxFrom(label, values));
}

// Daily totals per weekday (Mon … Sun), over the days that HAVE entries — with sparse spending the
// empty days would pin every median to 0. `outOf` keeps how many such weekdays the span has.
export function boxesByWeekday(rows: InsightsRow[], span: {start: Date; end: Date}, names: string[]): BoxStats[] {
  const perWeekday: number[][] = Array.from({length: 7}, () => []);
  const days = Array(7).fill(0);
  for (const [day, total] of bucketTotals(rows, "day", span)) {
    const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    days[weekday] += 1;
    if (total !== 0) perWeekday[weekday].push(total);
  }
  return perWeekday.flatMap((values, i) => (values.length ? [{...boxFrom(names[i], values), outOf: days[i]}] : []));
}

export type KdePoint = {x: number; densities: number[]; below: number[]}; // below = share of values ≤ x

// Gaussian kernel density estimate for one or more sample sets on a shared grid (Silverman's rule
// for the bandwidth), so the curves can be overlaid. Densities are per euro; only their shape matters.
export function kde(sets: number[][], points = 120): KdePoint[] {
  const usable = sets.map((set) => (set.length > 1 ? set : []));
  const all = usable.flat();
  if (all.length < 2) return [];
  const bandwidths = usable.map((set) => {
    if (set.length < 2) return 0;
    const sorted = [...set].sort((a, b) => a - b);
    const mean = set.reduce((sum, v) => sum + v, 0) / set.length;
    const sd = Math.sqrt(set.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (set.length - 1));
    const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
    const spread = Math.min(sd, iqr / 1.34) || sd || Math.abs(mean) || 1;
    return 0.9 * spread * set.length ** -0.2;
  });
  const pad = 2 * Math.max(...bandwidths);
  const lo = Math.max(Math.min(...all) - pad, Math.min(0, ...all));
  const hi = Math.max(...all) + pad;
  const step = (hi - lo) / (points - 1);
  const sortedSets = usable.map((set) => [...set].sort((a, b) => a - b));
  return Array.from({length: points}, (_, i) => {
    const x = lo + i * step;
    return {
      x,
      below: sortedSets.map((set) => (set.length ? set.filter((v) => v <= x).length / set.length : 0)),
      densities: usable.map((set, s) => {
        const h = bandwidths[s];
        if (!h) return 0;
        const sum = set.reduce((acc, v) => acc + Math.exp(-0.5 * ((x - v) / h) ** 2), 0);
        return sum / (set.length * h * Math.sqrt(2 * Math.PI));
      }),
    };
  });
}
