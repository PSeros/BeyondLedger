// Pure, client-safe period math for budgets. Given a budget's period configuration and "now",
// resolves the active time window ([start, end), UTC; nulls = unbounded for OPEN) plus a stable
// periodKey used to look up per-instance overrides. Kept free of the Prisma client so both the
// server (actuals) and the client (period label) can use it.

export type BudgetPeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY" | "MONTH_OF_YEAR" | "RANGE" | "OPEN";

export const BUDGET_PERIOD_TYPES: BudgetPeriodType[] = [
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "MONTH_OF_YEAR",
  "RANGE",
  "OPEN",
];

export type PeriodInput = {
  periodType: BudgetPeriodType;
  anchorMonth: number | null;
  startDate: string | Date | null;
  endDate: string | Date | null;
};

export type ActivePeriod = {
  start: Date | null; // inclusive; null = unbounded (OPEN)
  end: Date | null; // exclusive; null = unbounded (OPEN)
  key: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDate(value: string | Date | null): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveActivePeriod(input: PeriodInput, now: Date = new Date()): ActivePeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0–11

  switch (input.periodType) {
    case "MONTHLY":
      return {
        start: new Date(Date.UTC(year, month, 1)),
        end: new Date(Date.UTC(year, month + 1, 1)),
        key: `${year}-${pad2(month + 1)}`,
      };
    case "QUARTERLY": {
      const q = Math.floor(month / 3);
      return {
        start: new Date(Date.UTC(year, q * 3, 1)),
        end: new Date(Date.UTC(year, q * 3 + 3, 1)),
        key: `${year}-Q${q + 1}`,
      };
    }
    case "YEARLY":
      return {
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year + 1, 0, 1)),
        key: `${year}`,
      };
    case "MONTH_OF_YEAR": {
      const m = input.anchorMonth && input.anchorMonth >= 1 && input.anchorMonth <= 12 ? input.anchorMonth : 1;
      return {
        start: new Date(Date.UTC(year, m - 1, 1)),
        end: new Date(Date.UTC(year, m, 1)),
        key: `${year}-${pad2(m)}`,
      };
    }
    case "RANGE": {
      const start = toDate(input.startDate);
      const endInclusive = toDate(input.endDate);
      // endDate is an inclusive day → the exclusive window end is the following midnight.
      const end = endInclusive ? new Date(endInclusive.getTime() + MS_PER_DAY) : null;
      return {start, end, key: "range"};
    }
    case "OPEN":
    default:
      return {start: null, end: null, key: "open"};
  }
}

const AVG_DAYS_PER_MONTH = 365.25 / 12;

function addUTCMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

// The length of a budget window in months — used to decide whether a contract's payment cycle fits
// inside the window (count real payments) or is longer than it (amortize a slice). Periodic types
// use their exact month count so the amortized fraction stays clean (e.g. a yearly contract in a
// monthly budget = exactly 1/12); RANGE is measured from its span; OPEN is unbounded (always count).
export function windowMonthsFor(periodType: BudgetPeriodType, start: Date | null, end: Date | null): number {
  switch (periodType) {
    case "MONTHLY":
    case "MONTH_OF_YEAR":
      return 1;
    case "QUARTERLY":
      return 3;
    case "YEARLY":
      return 12;
    case "RANGE":
      return start && end ? daysBetween(start, end) / AVG_DAYS_PER_MONTH : 1;
    case "OPEN":
    default:
      return Number.POSITIVE_INFINITY;
  }
}

export type ContractForContribution = {
  startDate: Date;
  endDate: Date | null;
  totalAmount: number;
  frequencyValue: number; // payments per year: Monthly 12, Quarterly 4, Yearly 1, One-time 1
  isRecurring: boolean;
};

// Counts a contract's trigger dates in [lower, upperExclusive). Triggers are anchored on the
// contract's startDate and stepped by its cycle (in whole months: monthly 1, quarterly 3, yearly
// 12), so counts are calendar-accurate integers. Jumps close to `lower` before walking so a
// long-running contract over a wide window doesn't iterate from its start.
function countTriggers(anchor: Date, lower: Date, upperExclusive: Date, periodMonths: number): number {
  const approxMonths =
    (lower.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (lower.getUTCMonth() - anchor.getUTCMonth());
  let k = Math.max(0, Math.floor(approxMonths / periodMonths) - 2);
  let count = 0;
  for (let guard = 0; guard < 100000; guard++) {
    const trigger = addUTCMonths(anchor, k * periodMonths);
    if (trigger >= upperExclusive) break;
    if (trigger >= lower) count += 1;
    k += 1;
  }
  return count;
}

// How much a single contract contributes to a budget window. Two regimes, both clamped to the
// contract's active span [startDate, endDate]:
//   • cycle fits inside the window (periodMonths ≤ windowMonths) → COUNT the real trigger dates in
//     the window. Bounded windows forecast the WHOLE window (so a fresh yearly budget already shows
//     its monthly contracts filling up); OPEN has no end, so it counts only up to `now`.
//   • cycle longer than the window → AMORTIZE: amount × (windowMonths / periodMonths), scaled by how
//     much of the window the contract is actually active for (a yearly contract in a monthly budget
//     = 1/12, prorated if it starts/ends mid-window).
// Non-recurring (One-time) contracts are a single dated charge: the amount if their startDate lands
// in the window, else 0. `windowMonths` comes from windowMonthsFor(); pass the budget's own `now`.
export function computeContractContribution(
  contract: ContractForContribution,
  window: {start: Date | null; end: Date | null},
  windowMonths: number,
  now: Date = new Date(),
): number {
  const {startDate, endDate, totalAmount, frequencyValue, isRecurring} = contract;

  // Bounded windows forecast to their end; OPEN (end == null) caps at today.
  const winEnd = window.end ?? now;
  // Lower bound: the later of the window start (unbounded for OPEN) and the contract's start.
  const lower = window.start != null && window.start > startDate ? window.start : startDate;
  // Upper bound: the earlier of the window end and the day after the contract's (inclusive) endDate.
  const endExclusive = endDate != null ? new Date(endDate.getTime() + MS_PER_DAY) : null;
  const upper = endExclusive != null && endExclusive < winEnd ? endExclusive : winEnd;

  if (lower >= upper) return 0;

  // One-time: a single charge on its startDate.
  if (!isRecurring) {
    return startDate >= lower && startDate < upper ? totalAmount : 0;
  }

  const periodMonths = 12 / frequencyValue;

  if (periodMonths <= windowMonths) {
    return countTriggers(startDate, lower, upper, periodMonths) * totalAmount;
  }

  // Amortize. This branch is only reached when windowMonths is finite (periodMonths is finite and
  // strictly smaller windows land here), so window.start is non-null.
  const windowDays = daysBetween(window.start as Date, winEnd);
  const overlapDays = daysBetween(lower, upper);
  const activeFraction = windowDays > 0 ? Math.min(1, overlapDays / windowDays) : 0;
  return totalAmount * (windowMonths / periodMonths) * activeFraction;
}
