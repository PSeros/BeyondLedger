import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {
  addDays,
  addMonths,
  buildMonthView,
  buildWeekView,
  buildYearView,
  type ChartPoint,
  dateKey,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard cash-flow charts (Phase 12): one combined EXPENSE stream (variable bills + fixed
// contracts) and one combined INCOME stream (one-time + recurring), each fed into ChartCard. Same
// cumulative "this period vs. rolling average of prior periods (+ upcoming forecast)" machinery as
// the per-domain charts, but summed across both sub-streams so the dashboard shows one line per
// direction. Honors the active account (workspaceId). Ignores date range by nature (see billChartData).

const WEEK_LOOKBACK = 8;
const MONTH_LOOKBACK = 6;
const YEAR_LOOKBACK = 3;

export type DashboardChartData = Partial<Record<"1W" | "1M" | "1Y", ChartPoint[]>>;

// Projects a recurring record's occurrences into the past (totalsByDay) / future (upcomingTotalsByDay)
// maps, mirroring contractChartData/incomeChartData. Splits on `today`.
function projectRecurring(
  totalsByDay: Map<string, number>,
  upcomingTotalsByDay: Map<string, number>,
  record: {startDate: Date; endDate: Date | null; amount: number; frequencyValue: number},
  today: Date,
  projectionHorizon: Date,
): void {
  const monthsBetween = 12 / record.frequencyValue;
  const stop = record.endDate && record.endDate < projectionHorizon ? record.endDate : projectionHorizon;

  let step = 0;
  let occurrence = utcDate(
    record.startDate.getUTCFullYear(),
    record.startDate.getUTCMonth(),
    record.startDate.getUTCDate(),
  );

  while (occurrence <= stop) {
    const key = dateKey(occurrence);
    const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
    target.set(key, (target.get(key) ?? 0) + record.amount);

    step += 1;
    occurrence = utcDate(
      record.startDate.getUTCFullYear(),
      record.startDate.getUTCMonth() + step * monthsBetween,
      record.startDate.getUTCDate(),
    );
  }
}

// `offset` (period navigator's ?co) shifts the anchor back/forward by N of each granularity's own
// unit; `today` stays the realized/forecast boundary so past periods fill and future ones forecast.
function buildViews(
  totalsByDay: Map<string, number>,
  upcomingTotalsByDay: Map<string, number>,
  today: Date,
  offset: number,
): DashboardChartData {
  return {
    "1W": buildWeekView(totalsByDay, addDays(today, offset * 7), WEEK_LOOKBACK, today),
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), MONTH_LOOKBACK, upcomingTotalsByDay, today),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), YEAR_LOOKBACK, upcomingTotalsByDay, today),
  };
}

export async function getDashboardExpenseChartData(
  workspaceId?: number | null,
  offset = 0,
): Promise<DashboardChartData> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const [bills, contracts] = await Promise.all([
    client.bill.findMany({where: buildBillWhere(wsFilter), select: {date: true, totalAmount: true}}),
    client.contract.findMany({where: buildContractWhere(wsFilter), include: {frequency: true}}),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const totalsByDay = new Map<string, number>();
  const upcomingTotalsByDay = new Map<string, number>();

  for (const bill of bills) {
    const key = dateKey(bill.date);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(bill.totalAmount));
  }
  for (const contract of contracts) {
    if (determineStatus(contract) !== "Active") continue;
    projectRecurring(
      totalsByDay,
      upcomingTotalsByDay,
      {
        startDate: contract.startDate,
        endDate: contract.endDate,
        amount: Number(contract.totalAmount),
        frequencyValue: contract.frequency.value,
      },
      today,
      projectionHorizon,
    );
  }

  return buildViews(totalsByDay, upcomingTotalsByDay, today, offset);
}

export async function getDashboardIncomeChartData(
  workspaceId?: number | null,
  offset = 0,
): Promise<DashboardChartData> {
  const wsFilter = workspaceId != null ? {workspaceId} : {};
  const [variableIncome, fixedIncome] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...wsFilter, isRecurring: false}),
      select: {startDate: true, totalAmount: true},
    }),
    client.income.findMany({
      where: buildIncomeWhere({...wsFilter, isRecurring: true}),
      include: {frequency: true},
    }),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const totalsByDay = new Map<string, number>();
  const upcomingTotalsByDay = new Map<string, number>();

  for (const income of variableIncome) {
    const key = dateKey(income.startDate);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(income.totalAmount));
  }
  for (const income of fixedIncome) {
    if (determineStatus(income) !== "Active") continue;
    projectRecurring(
      totalsByDay,
      upcomingTotalsByDay,
      {
        startDate: income.startDate,
        endDate: income.endDate,
        amount: Number(income.totalAmount),
        frequencyValue: income.frequency.value,
      },
      today,
      projectionHorizon,
    );
  }

  return buildViews(totalsByDay, upcomingTotalsByDay, today, offset);
}
