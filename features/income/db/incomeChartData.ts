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
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import {getLookback} from "@/features/settings/db/appSettings";
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
): Promise<IncomeVariableChartData> {
  const [incomes, lookback] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...filters, isRecurring: false}),
      select: {startDate: true, totalAmount: true},
    }),
    getLookback(),
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
    "1W": buildWeekView(totalsByDay, addDays(today, offset * 7), {lookback: lookback.weeks, dataStart, today}),
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), {lookback: lookback.months, dataStart, today}),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: lookback.years,
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
): Promise<IncomeFixedChartData> {
  const [incomes, lookback] = await Promise.all([
    client.income.findMany({
      where: buildIncomeWhere({...filters, isRecurring: true}),
      include: {frequency: true},
    }),
    getLookback(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const totalsByDay = new Map<string, number>();
  const upcomingTotalsByDay = new Map<string, number>();

  for (const income of incomes) {
    if (determineStatus(income) !== "Active") {
      continue;
    }

    const amount = Number(income.totalAmount);
    const monthsBetween = 12 / income.frequency.value;
    const stop = income.endDate && income.endDate < projectionHorizon ? income.endDate : projectionHorizon;

    let step = 0;
    let occurrence = utcDate(
      income.startDate.getUTCFullYear(),
      income.startDate.getUTCMonth(),
      income.startDate.getUTCDate(),
    );

    while (occurrence <= stop) {
      const key = dateKey(occurrence);
      const target = occurrence <= today ? totalsByDay : upcomingTotalsByDay;
      target.set(key, (target.get(key) ?? 0) + amount);

      step += 1;
      occurrence = utcDate(
        income.startDate.getUTCFullYear(),
        income.startDate.getUTCMonth() + step * monthsBetween,
        income.startDate.getUTCDate(),
      );
    }
  }

  const dataStart = earliestDay(totalsByDay);

  return {
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), {
      lookback: lookback.months,
      dataStart,
      futureTotalsByDay: upcomingTotalsByDay,
      today,
    }),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), {
      lookback: lookback.years,
      dataStart,
      futureTotalsByDay: upcomingTotalsByDay,
      today,
    }),
  };
}
