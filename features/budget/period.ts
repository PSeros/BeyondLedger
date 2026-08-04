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
