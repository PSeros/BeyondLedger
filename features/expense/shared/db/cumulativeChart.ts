const MONTH_LABELS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

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

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
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
 * Cumulative spend by day-of-month (1-31) for the current month vs. the average
 * cumulative pace of the last `lookbackMonths` complete months. Shorter historical
 * months hold their final total for day positions past their actual length (e.g.
 * day 31 against a 30-day month), so the average line never has gaps.
 *
 * When `futureTotalsByDay` is given (known future occurrences, e.g. projected contract
 * billing dates), an `upcoming` series is added: null before today, anchored to `current`'s
 * value exactly at today (so the two segments visually connect), then continuing the
 * cumulative sum through the rest of the month using the future data.
 */
export function buildMonthView(
  totalsByDay: Map<string, number>,
  today: Date,
  lookbackMonths: number,
  futureTotalsByDay?: Map<string, number>,
): ChartPoint[] {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const monthStart = utcDate(year, month, 1);
  const monthLength = daysInMonth(year, month);
  const todayDay = today.getUTCDate();
  const cumulativeAtToday = sumRange(totalsByDay, monthStart, todayDay);

  return Array.from({length: 31}, (_, i) => {
    const day = i + 1;
    const current = day <= monthLength && day <= todayDay ? sumRange(totalsByDay, monthStart, day) : null;

    const historical: number[] = [];
    for (let m = 1; m <= lookbackMonths; m++) {
      const pastMonthStart = utcDate(year, month - m, 1);
      const pastMonthLength = daysInMonth(pastMonthStart.getUTCFullYear(), pastMonthStart.getUTCMonth());
      historical.push(sumRange(totalsByDay, pastMonthStart, Math.min(day, pastMonthLength)));
    }

    let upcoming: number | null | undefined;
    if (futureTotalsByDay) {
      if (day > monthLength || day < todayDay) {
        upcoming = null;
      } else if (day === todayDay) {
        upcoming = cumulativeAtToday;
      } else {
        upcoming = cumulativeAtToday + sumRange(futureTotalsByDay, addDays(today, 1), day - todayDay);
      }
    }

    return {label: String(day), current, previous: average(historical), upcoming};
  });
}

/**
 * Cumulative spend by month-of-year (Jan-Dec) for the current year vs. the average
 * cumulative pace of the last `lookbackYears` years. See {@link buildMonthView} for the
 * `futureTotalsByDay` / `upcoming` behavior.
 */
export function buildYearView(
  totalsByDay: Map<string, number>,
  today: Date,
  lookbackYears: number,
  futureTotalsByDay?: Map<string, number>,
): ChartPoint[] {
  const year = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth();
  const yearStart = utcDate(year, 0, 1);
  const tomorrow = addDays(today, 1);
  const cumulativeAtToday = sumRange(totalsByDay, yearStart, daysBetween(yearStart, tomorrow));

  return MONTH_LABELS.map((label, month) => {
    const current =
      month <= todayMonth
        ? sumRange(
            totalsByDay,
            yearStart,
            daysBetween(yearStart, month === todayMonth ? tomorrow : utcDate(year, month + 1, 1)),
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
      if (month < todayMonth) {
        upcoming = null;
      } else if (month === todayMonth) {
        upcoming = cumulativeAtToday;
      } else {
        const monthEnd = utcDate(year, month + 1, 1);
        upcoming = cumulativeAtToday + sumRange(futureTotalsByDay, tomorrow, daysBetween(tomorrow, monthEnd));
      }
    }

    return {label, current, previous: average(historical), upcoming};
  });
}
