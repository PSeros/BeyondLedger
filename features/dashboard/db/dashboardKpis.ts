import {client} from "@/lib/prisma";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {
  addDays,
  baselineAverage,
  chartWindow,
  daysBetween,
  dateKey,
  type Granularity,
  type Lookback,
  sumRange,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {getDataStart} from "@/features/expense/shared/db/dataHorizon";
import {getLookback} from "@/features/settings/db/appSettings";

// Dashboard KPI row (Phase 12): total money IN (income), OUT (expense = variable bills + fixed
// contracts) and NET for the period selected in the dashboard toolbar vs. the average of the
// preceding periods of the same granularity, so StatCard shows how this week/month/year compares to
// the recent trend. How many periods that is comes from the same AppSettings.lookback* preference
// the chart Ø lines read, so the two genuinely mirror each other. KPIs report REALIZED money
// only (never the forecast tail) and compare pace-to-date — see getPeriodKpis. Recurring
// contracts/income have no per-occurrence row, so their billing dates are projected into the window;
// one-time
// bills/contracts/income use their real dates. All streams honor the active account (workspaceId).

// `previous` is null when no prior period overlaps the data horizon — a baseline that cannot be
// computed, as distinct from one that is genuinely zero. StatCard renders it as "–".
export type KpiPair = {current: number; previous: number | null};

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

// The user's lookback for the granularity on screen.
function periodsFor(granularity: Granularity, lookback: Lookback): number {
  if (granularity === "1W") return lookback.weeks;
  if (granularity === "1Y") return lookback.years;
  return lookback.months;
}

export async function getPeriodKpis(
  workspaceId: number | null | undefined,
  granularity: Granularity,
  offset: number,
): Promise<DashboardKpis> {
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  // Unlike the chart data functions (which hold every row and can read the horizon off their own
  // totals map), the queries below are span-bounded, so the horizon has to be asked for separately.
  // Per stream, not shared: a rent contract running since 2019 legitimately extends the EXPENSE
  // horizon back that far, and folding that into income would dilute the income baseline with years
  // of empty periods — the exact problem this whole mechanism exists to avoid.
  const [lookback, expenseStart, incomeStart] = await Promise.all([
    getLookback(),
    getDataStart(workspaceId, ["bills", "contracts"]),
    getDataStart(workspaceId, ["income"]),
  ]);

  // The selected period, plus the configured number of windows immediately before it (same unit).
  // The full span [oldest baseline start, current end) bounds every query and projection.
  const current = chartWindow(granularity, offset, today);
  const priors = Array.from({length: periodsFor(granularity, lookback)}, (_, k) =>
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

  // Only prior windows that overlap the stream's data horizon count as samples, so a fresh install
  // compares against the weeks it actually has instead of dividing by a full lookback of mostly
  // pre-history. None qualifying → null (no baseline yet), never a misleading 0.
  const pair = (map: Map<string, number>, dataStart: Date | null): KpiPair => ({
    current: sumRange(map, current.start, elapsed),
    previous: baselineAverage(
      priors
        .filter((w) => dataStart !== null && w.end > dataStart)
        .map((w) => sumRange(map, w.start, Math.min(elapsed, daysBetween(w.start, w.end)))),
    ),
  });

  const expense = pair(expenseMap, expenseStart);
  const income = pair(incomeMap, incomeStart);
  const net: KpiPair = {
    current: income.current - expense.current,
    // Net's baseline needs both halves; if either side has no history yet there is no honest net to
    // compare against.
    previous:
      income.previous === null || expense.previous === null ? null : income.previous - expense.previous,
  };

  return {income, expense, net};
}
