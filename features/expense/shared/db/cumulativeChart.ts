const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ChartPoint = {
  label: string;
  current: number | null;
  previous: number;
  upcoming?: number | null;
};

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Parse the chart period-navigator's ?co param into a signed period offset (negative = past). Absent
// or non-integer → 0 (current period).
export function parseChartOffset(value: string | null | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

// ISO-8601 calendar week number (weeks start Monday; week 1 is the one containing the year's first
// Thursday). Used for the "KW 33" period-navigator label.
export function isoWeek(date: Date): number {
  const d = utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayNum = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // shift onto this week's Thursday
  const yearStart = utcDate(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * Add `months` calendar months to `date` in UTC, normalized to midnight. Month overflow rolls the
 * year (Nov + 3 → Feb next year); a day past the target month's length clamps to its last day
 * (Jan 31 + 1 → Feb 28/29) via JS Date's own month-overflow, guarded here.
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDayOfTarget = daysInMonth(year, month + months);
  return utcDate(year, month + months, Math.min(day, lastDayOfTarget));
}

export function daysBetween(start: Date, endExclusive: Date): number {
  return Math.round((endExclusive.getTime() - start.getTime()) / MS_PER_DAY);
}

export function daysInMonth(year: number, month: number): number {
  return utcDate(year, month + 1, 0).getUTCDate();
}

export function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** Sum of `totalsByDay` over `days` consecutive days starting at `start`. */
export function sumRange(totalsByDay: Map<string, number>, start: Date, days: number): number {
  let sum = 0;
  for (let i = 0; i < days; i++) {
    sum += totalsByDay.get(dateKey(addDays(start, i))) ?? 0;
  }
  return sum;
}

/**
 * Cumulative spend across the Mon–Sun week containing `anchor`, vs. the average cumulative pace of
 * the prior `lookbackWeeks` weeks. `today` is the realized/forecast boundary: a day is "current"
 * (has a value) only up to and including `today`, so the current week cuts off at today while a past
 * week (anchor before today) fills entirely and a future week shows nothing. Defaults `today` to
 * `anchor` for the no-navigation case (current period).
 */
export function buildWeekView(
  totalsByDay: Map<string, number>,
  anchor: Date,
  lookbackWeeks: number,
  today: Date = anchor,
): ChartPoint[] {
  const anchorIndex = (anchor.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  const weekStart = addDays(anchor, -anchorIndex);

  return WEEKDAY_LABELS.map((label, index) => {
    const dayDate = addDays(weekStart, index);
    const current = dayDate <= today ? sumRange(totalsByDay, weekStart, index + 1) : null;

    const historical: number[] = [];
    for (let w = 1; w <= lookbackWeeks; w++) {
      historical.push(sumRange(totalsByDay, addDays(weekStart, -7 * w), index + 1));
    }

    return {label, current, previous: average(historical)};
  });
}

/**
 * Cumulative spend by day-of-month (1-31) for the month containing `anchor` vs. the average
 * cumulative pace of the last `lookbackMonths` complete months. Shorter historical months hold
 * their final total for day positions past their actual length (e.g. day 31 against a 30-day month),
 * so the average line never has gaps.
 *
 * `today` is the realized/forecast boundary (defaults to `anchor`): within the anchor's month, days
 * are "current" only up to `today`. A month entirely before `today` fills completely; a month
 * entirely after shows no `current` (all forecast). When `futureTotalsByDay` is given (known future
 * occurrences, e.g. projected contract billing dates), an `upcoming` series is added: null before
 * the boundary, anchored to `current`'s value exactly at the boundary (so the two segments connect),
 * then continuing the cumulative sum through the rest of the month using the future data.
 */
export function buildMonthView(
  totalsByDay: Map<string, number>,
  anchor: Date,
  lookbackMonths: number,
  futureTotalsByDay?: Map<string, number>,
  today: Date = anchor,
): ChartPoint[] {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const monthStart = utcDate(year, month, 1);
  const nextMonthStart = utcDate(year, month + 1, 1);
  const monthLength = daysInMonth(year, month);

  // How many days of the anchor's month are realized as of `today`: the whole month once today is
  // past it, none while today is before it, else today's day-of-month.
  const realizedDay = today >= nextMonthStart ? monthLength : today < monthStart ? 0 : today.getUTCDate();
  const cumulativeAtBoundary = sumRange(totalsByDay, monthStart, realizedDay);

  return Array.from({length: 31}, (_, i) => {
    const day = i + 1;
    const current = day <= realizedDay ? sumRange(totalsByDay, monthStart, day) : null;

    const historical: number[] = [];
    for (let m = 1; m <= lookbackMonths; m++) {
      const pastMonthStart = utcDate(year, month - m, 1);
      const pastMonthLength = daysInMonth(pastMonthStart.getUTCFullYear(), pastMonthStart.getUTCMonth());
      historical.push(sumRange(totalsByDay, pastMonthStart, Math.min(day, pastMonthLength)));
    }

    let upcoming: number | null | undefined;
    if (futureTotalsByDay) {
      if (day > monthLength || day < realizedDay) {
        upcoming = null;
      } else if (day === realizedDay) {
        upcoming = cumulativeAtBoundary;
      } else {
        upcoming = cumulativeAtBoundary + sumRange(futureTotalsByDay, addDays(monthStart, realizedDay), day - realizedDay);
      }
    }

    return {label: String(day), current, previous: average(historical), upcoming};
  });
}

/**
 * Cumulative spend by month-of-year (Jan-Dec) for the year containing `anchor` vs. the average
 * cumulative pace of the last `lookbackYears` years. `today` is the realized/forecast boundary
 * (defaults to `anchor`). See {@link buildMonthView} for the `futureTotalsByDay` / `upcoming`
 * behavior.
 */
export function buildYearView(
  totalsByDay: Map<string, number>,
  anchor: Date,
  lookbackYears: number,
  futureTotalsByDay?: Map<string, number>,
  today: Date = anchor,
): ChartPoint[] {
  const year = anchor.getUTCFullYear();
  const yearStart = utcDate(year, 0, 1);
  const nextYearStart = utcDate(year + 1, 0, 1);

  // The realized region within the anchor's year: whole year once today is past it (boundary = next
  // year's start), nothing while today is before it, else through the end of today.
  const realizedMonth = today >= nextYearStart ? 11 : today < yearStart ? -1 : today.getUTCMonth();
  const boundary = today >= nextYearStart ? nextYearStart : today < yearStart ? yearStart : addDays(today, 1);
  const cumulativeAtBoundary = sumRange(totalsByDay, yearStart, daysBetween(yearStart, boundary));

  return MONTH_LABELS.map((label, month) => {
    const current =
      month <= realizedMonth
        ? sumRange(
            totalsByDay,
            yearStart,
            daysBetween(yearStart, month === realizedMonth ? boundary : utcDate(year, month + 1, 1)),
          )
        : null;

    const historical: number[] = [];
    for (let y = 1; y <= lookbackYears; y++) {
      const pastYearStart = utcDate(year - y, 0, 1);
      const pastMonthEnd = utcDate(year - y, month + 1, 1);
      historical.push(sumRange(totalsByDay, pastYearStart, daysBetween(pastYearStart, pastMonthEnd)));
    }

    let upcoming: number | null | undefined;
    if (futureTotalsByDay) {
      if (month < realizedMonth) {
        upcoming = null;
      } else if (month === realizedMonth) {
        upcoming = cumulativeAtBoundary;
      } else {
        const monthEnd = utcDate(year, month + 1, 1);
        upcoming = cumulativeAtBoundary + sumRange(futureTotalsByDay, boundary, daysBetween(boundary, monthEnd));
      }
    }

    return {label, current, previous: average(historical), upcoming};
  });
}
