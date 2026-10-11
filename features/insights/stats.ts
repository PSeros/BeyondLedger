import {addDays, dateKey, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import type {InsightsRow} from "@/features/insights/db/insightsRows";
import type {BreakdownDimension, StatKey, StatUnit} from "@/features/insights/params";

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

const weekdayOf = (row: InsightsRow) => (new Date(`${row.date}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0

// The group key(s) of a row. An entry with several tags belongs to each of them.
function groupKeys(row: InsightsRow, by: BreakdownDimension, weekdayNames: string[]): string[] {
  if (by === "weekday") return [weekdayNames[weekdayOf(row)]];
  if (by === "tag") return row.tags.length ? row.tags : [UNTAGGED];
  return [by === "category" ? row.category : row.counterparty];
}

function groupRows(rows: InsightsRow[], by: BreakdownDimension, weekdayNames: string[]): Map<string, InsightsRow[]> {
  const groups = new Map<string, InsightsRow[]>();
  for (const row of rows) {
    for (const key of groupKeys(row, by, weekdayNames)) groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

const sumOf = (rows: InsightsRow[]) => rows.reduce((sum, row) => sum + row.amount, 0);

// Totals per group, biggest first (weekdays in calendar order), folded to `max` plus "Other". Tag
// totals can sum to more than the total (several tags per entry). Groups netting to ≤ 0 (bottle-
// deposit returns) have no share to draw and are dropped.
export function breakdown(rows: InsightsRow[], by: BreakdownDimension, weekdayNames: string[], max = 10): BreakdownRow[] {
  const groups = [...groupRows(rows, by, weekdayNames).entries()]
    .map(([key, list]) => ({key, amount: sumOf(list), count: list.length}))
    .filter((group) => group.amount > 0);
  if (by === "weekday") groups.sort((a, b) => weekdayNames.indexOf(a.key) - weekdayNames.indexOf(b.key));
  else groups.sort((a, b) => b.amount - a.amount);
  const kept = by === "weekday" || groups.length <= max + 1 ? groups : groups.slice(0, max);
  const rest = groups.slice(kept.length);
  if (rest.length) {
    kept.push({key: OTHER, amount: rest.reduce((s, g) => s + g.amount, 0), count: rest.reduce((s, g) => s + g.count, 0)});
  }
  return kept.map((group) => ({
    label: group.key === UNTAGGED || group.key === OTHER ? "" : group.key,
    amount: group.amount,
    count: group.count,
    isOther: group.key === OTHER,
    isUntagged: group.key === UNTAGGED,
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

// The box samples of one group, in the page's stats unit: line amounts, bill totals, or the totals
// of the days / weeks / months that HAVE entries for this group (with sparse spending the empty ones
// would pin every median to 0). Only positive values — refunds have no place on a spend spread.
function groupSamples(rows: InsightsRow[], unit: StatUnit, span: {start: Date; end: Date}): number[] {
  const samples = unit === "item" || unit === "bill" ? samplesFor(rows, unit, span) : [...bucketTotals(rows, unit, span).values()];
  return samples.filter((value) => value > 0);
}

// One box per group (the `groups` biggest by total; weekdays in calendar order). Week / month units
// make no sense inside a weekday, so weekdays then fall back to daily totals; `outOf` keeps how many
// of that weekday the span has.
export function boxesFor(
  rows: InsightsRow[],
  by: BreakdownDimension,
  unit: StatUnit,
  span: {start: Date; end: Date},
  weekdayNames: string[],
  groups = 8,
): BoxStats[] {
  const grouped = [...groupRows(rows, by, weekdayNames).entries()].filter(([key]) => key !== UNTAGGED);
  if (by === "weekday") {
    const weekdayUnit: StatUnit = unit === "week" || unit === "month" ? "day" : unit;
    const daysPerWeekday = Array(7).fill(0);
    for (let day = span.start; day < span.end; day = addDays(day, 1)) daysPerWeekday[(day.getUTCDay() + 6) % 7] += 1;
    return grouped
      .sort((a, b) => weekdayNames.indexOf(a[0]) - weekdayNames.indexOf(b[0]))
      .map(([key, list]) => ({values: groupSamples(list, weekdayUnit, span), key}))
      .filter(({values}) => values.length)
      .map(({key, values}) => ({
        ...boxFrom(key, values),
        ...(weekdayUnit === "day" ? {outOf: daysPerWeekday[weekdayNames.indexOf(key)]} : {}),
      }));
  }
  return grouped
    .sort((a, b) => sumOf(b[1]) - sumOf(a[1]))
    .slice(0, groups)
    .map(([key, list]) => ({key, values: groupSamples(list, unit, span)}))
    .filter(({values}) => values.length)
    .map(({key, values}) => boxFrom(key, values));
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
