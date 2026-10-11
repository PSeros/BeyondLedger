import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {buildSavingWhere} from "@/features/saving/db/savingWhere";
import {
  addDays,
  addMonths,
  type Baseline,
  buildMonthView,
  buildWeekView,
  buildYearView,
  type ChartPoint,
  type ChartMode,
  type Granularity,
  dateKey,
  earliestDay,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {fitsGranularity, forEachOccurrence} from "@/features/expense/shared/db/recurrence";
import {getBaseline} from "@/features/settings/db/appSettings";

// Dashboard cash-flow charts (Phase 12): one combined EXPENSE stream (variable bills + fixed
// contracts), one combined INCOME stream and one SAVING stream (#7), each one-time + recurring. Same
// cumulative "this period vs. rolling average of prior periods (+ upcoming forecast)" machinery as
// the per-domain charts, but summed across both sub-streams so the dashboard shows one line per
// direction. Honors the active account (workspaceId). Ignores date range by nature (see billChartData).

export type DashboardChartData = Partial<Record<"1W" | "1M" | "1Y", ChartPoint[]>>;

// One stream, as it exists for ONE granularity: every one-off at its real date, plus only those
// recurring records whose interval fits that granularity's period (see fitsGranularity). Built per
// granularity because a monthly rent in a weekly view hits ~1 week in 4 — that bimodality is what
// left the dashboard's weekly Ø describing no real week.
type OneOff = {date: Date; amount: number};
type Recurring = {
  startDate: Date;
  endDate: Date | null;
  amount: number;
  frequency: {value: number; isRecurring: boolean};
};

function streamFor(
  granularity: Granularity,
  oneOff: OneOff[],
  recurring: Recurring[],
  today: Date,
  projectionHorizon: Date,
): {totalsByDay: Map<string, number>; upcomingTotalsByDay: Map<string, number>; dataStart: Date | null} {
  const totalsByDay = new Map<string, number>();
  const upcomingTotalsByDay = new Map<string, number>();

  for (const row of oneOff) {
    const key = dateKey(row.date);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + row.amount);
  }
  for (const row of recurring) {
    if (!fitsGranularity(row.frequency, granularity)) continue;
    forEachOccurrence(row, row.startDate, addDays(projectionHorizon, 1), (occurrence) => {
      const key = dateKey(occurrence);
      const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
      target.set(key, (target.get(key) ?? 0) + row.amount);
    });
  }

  return {totalsByDay, upcomingTotalsByDay, dataStart: earliestDay(totalsByDay)};
}

// `offset` (period navigator's ?co) shifts the anchor back/forward by N of each granularity's own
// unit; `today` stays the realized/forecast boundary so past periods fill and future ones forecast.
// `baseline` is the user's Ø setting and `dataStart` the horizon that truncates it.
function buildViews(
  oneOff: OneOff[],
  recurring: Recurring[],
  today: Date,
  offset: number,
  baseline: Baseline,
  projectionHorizon: Date,
  mode: ChartMode,
): DashboardChartData {
  const week = streamFor("1W", oneOff, recurring, today, projectionHorizon);
  const month = streamFor("1M", oneOff, recurring, today, projectionHorizon);
  const year = streamFor("1Y", oneOff, recurring, today, projectionHorizon);

  return {
    "1W": buildWeekView(week.totalsByDay, addDays(today, offset * 7), {
      lookback: baseline.lookback.weeks,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart: week.dataStart,
      today,
    }),
    "1M": buildMonthView(month.totalsByDay, addMonths(today, offset), {
      lookback: baseline.lookback.months,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart: month.dataStart,
      futureTotalsByDay: month.upcomingTotalsByDay,
      today,
    }),
    "1Y": buildYearView(year.totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: baseline.lookback.years,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart: year.dataStart,
      futureTotalsByDay: year.upcomingTotalsByDay,
      today,
    }),
  };
}

export async function getDashboardExpenseChartData(
  workspaceId?: number | null,
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<DashboardChartData> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const [bills, contracts, baseline] = await Promise.all([
    client.bill.findMany({where: buildBillWhere(wsFilter), select: {date: true, totalAmount: true}}),
    client.contract.findMany({where: buildContractWhere(wsFilter), include: {frequency: true}}),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  return buildViews(
    bills.map((bill) => ({date: bill.date, amount: Number(bill.totalAmount)})),
    contracts
      .filter((contract) => determineStatus(contract) === "Active")
      .map((contract) => ({
        startDate: contract.startDate,
        endDate: contract.endDate,
        amount: Number(contract.totalAmount),
        frequency: contract.frequency,
      })),
    today,
    offset,
    baseline,
    projectionHorizon,
    mode,
  );
}

export async function getDashboardIncomeChartData(
  workspaceId?: number | null,
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<DashboardChartData> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const [variableIncome, fixedIncome, baseline] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...wsFilter, isRecurring: false}),
      select: {startDate: true, totalAmount: true},
    }),
    client.income.findMany({
      where: buildIncomeWhere({...wsFilter, isRecurring: true}),
      include: {frequency: true},
    }),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  return buildViews(
    variableIncome.map((income) => ({date: income.startDate, amount: Number(income.totalAmount)})),
    fixedIncome
      .filter((income) => determineStatus(income) === "Active")
      .map((income) => ({
        startDate: income.startDate,
        endDate: income.endDate,
        amount: Number(income.totalAmount),
        frequency: income.frequency,
      })),
    today,
    offset,
    baseline,
    projectionHorizon,
    mode,
  );
}

// Same shape as income: one-off deposits/withdrawals at their dates plus Active plans projected.
export async function getDashboardSavingChartData(
  workspaceId?: number | null,
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<DashboardChartData> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const [oneOffs, plans, baseline] = await Promise.all([
    client.saving.findMany({
      // A starting balance isn't saved out of this period's income.
      where: {AND: [buildSavingWhere({...wsFilter, isRecurring: false}), {isOpening: false}]},
      select: {startDate: true, totalAmount: true},
    }),
    client.saving.findMany({
      where: buildSavingWhere({...wsFilter, isRecurring: true}),
      include: {frequency: true},
    }),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  return buildViews(
    oneOffs.map((saving) => ({date: saving.startDate, amount: Number(saving.totalAmount)})),
    plans
      .filter((saving) => determineStatus(saving) === "Active")
      .map((saving) => ({
        startDate: saving.startDate,
        endDate: saving.endDate,
        amount: Number(saving.totalAmount),
        frequency: saving.frequency,
      })),
    today,
    offset,
    baseline,
    projectionHorizon,
    mode,
  );
}
