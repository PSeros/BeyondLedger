import {client} from "@/lib/prisma";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {
  addDays,
  average,
  chartWindow,
  daysBetween,
  dateKey,
  type Granularity,
  sumRange,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard KPI row (Phase 12): total money IN (income), OUT (expense = variable bills + fixed
// contracts) and NET for the period selected in the dashboard toolbar vs. the average of the 3
// preceding periods of the same granularity, so StatCard shows how this week/month/year compares to
// the recent trend (mirroring the chart's own rolling-average baseline). KPIs report REALIZED money
// only (never the forecast tail) and compare pace-to-date — see getPeriodKpis. Recurring
// contracts/income have no per-occurrence row, so their billing dates are projected into the window;
// one-time
// bills/contracts/income use their real dates. All streams honor the active account (workspaceId).

export type KpiPair = {current: number; previous: number};

export type DashboardKpis = {
  income: KpiPair;
  expense: KpiPair;
  net: KpiPair;
};

// Adds a recurring record's projected occurrences (amount at each billing date) into `map`, but only
// those landing in [rangeStart, rangeEnd). Fast-forwards to the window rather than stepping from a
// possibly years-old startDate. Only frequencies whose value evenly divides 12 are projected.
function projectRecurringInto(
  map: Map<string, number>,
  record: {startDate: Date; endDate: Date | null; amount: number; frequencyValue: number},
  rangeStart: Date,
  rangeEnd: Date,
): void {
  const monthsBetween = 12 / record.frequencyValue;
  const stop = record.endDate && record.endDate < rangeEnd ? record.endDate : rangeEnd;

  let step = 0;
  let occurrence = utcDate(
    record.startDate.getUTCFullYear(),
    record.startDate.getUTCMonth(),
    record.startDate.getUTCDate(),
  );

  // Advance to the first occurrence on/after the window start.
  while (occurrence < rangeStart) {
    step += 1;
    occurrence = utcDate(
      record.startDate.getUTCFullYear(),
      record.startDate.getUTCMonth() + step * monthsBetween,
      record.startDate.getUTCDate(),
    );
  }

  while (occurrence < stop) {
    const key = dateKey(occurrence);
    map.set(key, (map.get(key) ?? 0) + record.amount);
    step += 1;
    occurrence = utcDate(
      record.startDate.getUTCFullYear(),
      record.startDate.getUTCMonth() + step * monthsBetween,
      record.startDate.getUTCDate(),
    );
  }
}

// How many preceding periods the KPI baseline averages over (the "3 × granularity" trend).
const BASELINE_PERIODS = 3;

export async function getPeriodKpis(
  workspaceId: number | null | undefined,
  granularity: Granularity,
  offset: number,
): Promise<DashboardKpis> {
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  // The selected period, plus the BASELINE_PERIODS windows immediately before it (same unit). The
  // full span [oldest baseline start, current end) bounds every query and projection.
  const current = chartWindow(granularity, offset, today);
  const priors = Array.from({length: BASELINE_PERIODS}, (_, k) =>
    chartWindow(granularity, offset - (k + 1), today),
  );
  const spanStart = priors[priors.length - 1].start;
  const spanEnd = current.end;

  const wsFilter = workspaceId != null ? {workspaceId} : {};

  const [bills, recurringContracts, oneTimeContracts, variableIncome, fixedIncome] = await Promise.all([
    client.bill.findMany({
      where: {AND: [buildBillWhere(wsFilter), {date: {gte: spanStart, lt: spanEnd}}]},
      select: {date: true, totalAmount: true},
    }),
    client.contract.findMany({
      where: {AND: [buildContractWhere(wsFilter), {frequency: {isRecurring: true}}]},
      include: {frequency: true},
    }),
    client.contract.findMany({
      where: {
        AND: [buildContractWhere(wsFilter), {frequency: {isRecurring: false}}, {startDate: {gte: spanStart, lt: spanEnd}}],
      },
      select: {startDate: true, totalAmount: true},
    }),
    client.income.findMany({
      where: {
        AND: [buildIncomeWhere({...wsFilter, isRecurring: false}), {startDate: {gte: spanStart, lt: spanEnd}}],
      },
      select: {startDate: true, totalAmount: true},
    }),
    client.income.findMany({
      where: buildIncomeWhere({...wsFilter, isRecurring: true}),
      include: {frequency: true},
    }),
  ]);

  const expenseMap = new Map<string, number>();
  for (const bill of bills) {
    const key = dateKey(bill.date);
    expenseMap.set(key, (expenseMap.get(key) ?? 0) + Number(bill.totalAmount));
  }
  for (const contract of oneTimeContracts) {
    const key = dateKey(contract.startDate);
    expenseMap.set(key, (expenseMap.get(key) ?? 0) + Number(contract.totalAmount));
  }
  for (const contract of recurringContracts) {
    projectRecurringInto(
      expenseMap,
      {
        startDate: contract.startDate,
        endDate: contract.endDate,
        amount: Number(contract.totalAmount),
        frequencyValue: contract.frequency.value,
      },
      spanStart,
      spanEnd,
    );
  }

  const incomeMap = new Map<string, number>();
  for (const income of variableIncome) {
    const key = dateKey(income.startDate);
    incomeMap.set(key, (incomeMap.get(key) ?? 0) + Number(income.totalAmount));
  }
  for (const income of fixedIncome) {
    projectRecurringInto(
      incomeMap,
      {
        startDate: income.startDate,
        endDate: income.endDate,
        amount: Number(income.totalAmount),
        frequencyValue: income.frequency.value,
      },
      spanStart,
      spanEnd,
    );
  }

  // Pace-to-date: compare the REALIZED slice of the selected period (day 1 → today) against the same
  // first-N-days slice of each prior period. This keeps the % honest all period long — a mid-period
  // partial is never held against full prior totals — and mirrors the line chart's cumulative-to-date
  // baseline. A fully past period elapses its whole length (full-vs-full); a future one elapses zero.
  const tomorrow = addDays(today, 1);
  const currentLength = daysBetween(current.start, current.end);
  const elapsed = Math.min(Math.max(daysBetween(current.start, tomorrow), 0), currentLength);

  const pair = (map: Map<string, number>): KpiPair => ({
    current: sumRange(map, current.start, elapsed),
    previous: average(
      priors.map((w) => sumRange(map, w.start, Math.min(elapsed, daysBetween(w.start, w.end)))),
    ),
  });

  const expense = pair(expenseMap);
  const income = pair(incomeMap);
  const net: KpiPair = {
    current: income.current - expense.current,
    previous: income.previous - expense.previous,
  };

  return {income, expense, net};
}
