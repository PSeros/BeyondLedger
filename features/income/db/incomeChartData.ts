import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildIncomeWhere, type IncomeFilters} from "@/features/income/db/incomeWhere";
import {
  addDays,
  addMonths,
  buildMonthView,
  buildWeekView,
  buildYearView,
  dateKey,
  earliestDay,
  type ChartMode,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {fitsGranularity, forEachOccurrence} from "@/features/expense/shared/db/recurrence";
import {getBaseline} from "@/features/settings/db/appSettings";
import type {IncomeFixedChartData, IncomeVariableChartData} from "@/features/income/types";

// The rolling window for the "previous" (average) baseline line is a user setting
// (AppSettings.lookback*) — recent periods, not the whole history — and is further clipped to the
// periods this chart's own income records actually cover.

// The chart is a cumulative "this period vs. rolling average of prior periods" comparison. `offset`
// (the period navigator's ?co param) shifts the anchor back/forward by N of each granularity's unit;
// `today` stays the realized/forecast boundary. It deliberately ignores the date range (which would
// starve the baseline) and status (fixed income is Active-by-nature here). Only the categorical
// filters + the tab discriminator apply.
export type IncomeChartFilters = Omit<IncomeFilters, "status" | "dateFrom" | "dateTo" | "isRecurring">;

// Variable (one-time) income has real per-occurrence dates (startDate) — same real-date machinery as
// the Bill chart, with a weekday view.
export async function getVariableIncomeChartData(
  filters: IncomeChartFilters = {},
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<IncomeVariableChartData> {
  const [incomes, baseline] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...filters, isRecurring: false}),
      select: {startDate: true, totalAmount: true},
    }),
    getBaseline(),
  ]);

  const totalsByDay = new Map<string, number>();
  for (const income of incomes) {
    const key = dateKey(income.startDate);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(income.totalAmount));
  }

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const dataStart = earliestDay(totalsByDay);

  return {
    "1W": buildWeekView(totalsByDay, addDays(today, offset * 7), {
      lookback: baseline.lookback.weeks,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart,
      today,
    }),
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), {
      lookback: baseline.lookback.months,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart,
      today,
    }),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: baseline.lookback.years,
      metric: baseline.metric,
      start: baseline.start,
      mode,
      dataStart,
      today,
    }),
  };
}

// Fixed (recurring) income has no per-occurrence record — only a recurring amount + frequency, like
// Contract. Project the payout dates from startDate/frequency/endDate so they feed the same
// cumulative-sum machinery; occurrences past today drive the "upcoming" forecast line.
export async function getFixedIncomeChartData(
  filters: IncomeChartFilters = {},
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<IncomeFixedChartData> {
  const [incomes, baseline] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...filters, isRecurring: true}),
      include: {frequency: true},
    }),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const active = incomes.filter((income) => determineStatus(income) === "Active");

  // Per granularity: fitsGranularity drops a payout whose interval is longer than the view's period
  // (a yearly bonus hits 1 month in 12, which leaves the Ø line describing no real month).
  const streamFor = (granularity: "1M" | "1Y") => {
    const totalsByDay = new Map<string, number>();
    const upcomingTotalsByDay = new Map<string, number>();
    for (const income of active) {
      if (!fitsGranularity(income.frequency, granularity)) continue;
      const amount = Number(income.totalAmount);
      forEachOccurrence(
        {startDate: income.startDate, endDate: income.endDate, frequency: income.frequency},
        income.startDate,
        addDays(projectionHorizon, 1),
        (occurrence) => {
          const key = dateKey(occurrence);
          const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
          target.set(key, (target.get(key) ?? 0) + amount);
        },
      );
    }
    return {totalsByDay, upcomingTotalsByDay, dataStart: earliestDay(totalsByDay)};
  };

  const month = streamFor("1M");
  const year = streamFor("1Y");

  return {
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
