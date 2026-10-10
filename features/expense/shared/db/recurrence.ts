import {addDays, addMonths, daysBetween, type Granularity, utcDate} from "@/features/expense/shared/db/cumulativeChart";

// One place for projecting a recurring record's (Contract/Income) billing dates, and for deciding
// whether such a record belongs in a given chart granularity at all.
//
// Replaces seven near-identical `12 / frequency.value` month-stepping loops. Those were only
// correct for frequency values that divide 12 (1, 2, 3, 4, 6, 12): Date.UTC floors a fractional
// month, so a weekly (52) or biweekly (26) frequency re-emitted the same date 2-5x and the caller
// added the amount to that day each time. Frequencies are user-editable, so any integer can occur.

export type RecurringRecord = {
  startDate: Date;
  endDate: Date | null;
  /** Frequency.value — occurrences per year. */
  frequencyValue: number;
};

const DAYS_PER_YEAR = 365.25;

function recurs(frequencyValue: number): boolean {
  return Number.isFinite(frequencyValue) && frequencyValue >= 1;
}

// Whole-month intervals step calendar months so the day-of-month is preserved (and clamped on short
// months by addMonths). Anything else steps a fixed day count — the only sane reading of weekly,
// biweekly or semi-monthly.
function interval(frequencyValue: number): {months: number; days: 0} | {months: 0; days: number} {
  if (12 % frequencyValue === 0) return {months: 12 / frequencyValue, days: 0};
  return {months: 0, days: Math.max(1, Math.round(DAYS_PER_YEAR / frequencyValue))};
}

function atMidnight(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Occurrence number `step` (0 = the start date itself) of a record recurring `frequencyValue`/year. */
export function occurrenceAt(startDate: Date, frequencyValue: number, step: number): Date {
  const start = atMidnight(startDate);
  if (!recurs(frequencyValue) || step === 0) return start;
  const {months, days} = interval(frequencyValue);
  return months > 0 ? addMonths(start, step * months) : addDays(start, step * days);
}

// Jump straight to the occurrence near `from` instead of stepping from a possibly years-old
// startDate. May be off by one either way, so callers correct with a short walk.
function estimateStep(start: Date, from: Date, frequencyValue: number): number {
  const {months, days} = interval(frequencyValue);
  const span =
    months > 0
      ? (from.getUTCFullYear() - start.getUTCFullYear()) * 12 + (from.getUTCMonth() - start.getUTCMonth())
      : daysBetween(start, from);
  return Math.max(0, Math.floor(span / (months > 0 ? months : days)));
}

/** The record's last payable day: its endDate if it has one (a payment on that day still counts). */
function hardStop(record: RecurringRecord, toExclusive: Date): Date {
  if (!record.endDate) return toExclusive;
  const endExclusive = addDays(atMidnight(record.endDate), 1);
  return endExclusive < toExclusive ? endExclusive : toExclusive;
}

/**
 * Calls `onOccurrence` for every projected occurrence in `[from, toExclusive)`, never past the
 * record's own endDate. A non-recurring frequency yields the start date alone.
 */
export function forEachOccurrence(
  record: RecurringRecord,
  from: Date,
  toExclusive: Date,
  onOccurrence: (date: Date) => void,
): void {
  const start = atMidnight(record.startDate);
  const stop = hardStop(record, toExclusive);

  if (!recurs(record.frequencyValue)) {
    if (start >= from && start < stop) onOccurrence(start);
    return;
  }

  let step = estimateStep(start, from, record.frequencyValue);
  while (step > 0 && occurrenceAt(start, record.frequencyValue, step - 1) >= from) step -= 1;

  let occurrence = occurrenceAt(start, record.frequencyValue, step);
  while (occurrence < from) {
    step += 1;
    occurrence = occurrenceAt(start, record.frequencyValue, step);
  }
  while (occurrence < stop) {
    onOccurrence(occurrence);
    step += 1;
    occurrence = occurrenceAt(start, record.frequencyValue, step);
  }
}

/** First occurrence on/after `from`, or null if the record ends before one lands. */
export function nextOccurrence(record: RecurringRecord, from: Date): Date | null {
  let found: Date | null = null;
  // A year past `from` is far enough for any frequency of once a year or more.
  forEachOccurrence(record, from, addDays(from, 367), (date) => {
    found ??= date;
  });
  return found;
}

/** How many occurrences land in `[start, end)`. */
export function countOccurrences(record: RecurringRecord, start: Date, end: Date): number {
  let count = 0;
  forEachOccurrence(record, start, end, () => {
    count += 1;
  });
  return count;
}

export function periodsPerYear(granularity: Granularity): number {
  return granularity === "1W" ? 52 : granularity === "1M" ? 12 : 1;
}

/**
 * Whether a record belongs in `granularity` at all: it must recur at least once per period, so its
 * spikes are something every period has rather than a few periods carrying all of them.
 *
 * A monthly rent in a weekly view hits ~1 week in 4, which makes the sample set bimodal and leaves
 * the Ø line describing no real week (and lurching mid-week as the sort order crosses over). Driven
 * purely by occurrences/year, so a user-added frequency sorts itself: bimonthly (6) drops out of
 * 1M, semi-monthly (24) stays in 1M but drops out of 1W. One-offs have a real date and always fit.
 */
export function fitsGranularity(
  frequency: {value: number; isRecurring: boolean},
  granularity: Granularity,
): boolean {
  return !frequency.isRecurring || frequency.value >= periodsPerYear(granularity);
}
