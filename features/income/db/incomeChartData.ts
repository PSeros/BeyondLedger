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
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import type {IncomeFixedChartData, IncomeVariableChartData} from "@/features/income/types";

// Rolling windows for the "previous" (average) baseline line — recent periods, not the whole history.
const WEEK_LOOKBACK = 8;
const MONTH_LOOKBACK = 6;
const YEAR_LOOKBACK = 3;

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
  const incomes = await client.income.findMany({
    where: buildIncomeWhere({...filters, isRecurring: false}),
    select: {startDate: true, totalAmount: true},
  });

  const totalsByDay = new Map<string, number>();
  for (const income of incomes) {
    const key = dateKey(income.startDate);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(income.totalAmount));
  }

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return {
    "1W": buildWeekView(totalsByDay, addDays(today, offset * 7), WEEK_LOOKBACK, today),
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), MONTH_LOOKBACK, undefined, today),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), YEAR_LOOKBACK, undefined, today),
  };
}

// Fixed (recurring) income has no per-occurrence record — only a recurring amount + frequency, like
// Contract. Project the payout dates from startDate/frequency/endDate so they feed the same
// cumulative-sum machinery; occurrences past today drive the "upcoming" forecast line.
export async function getFixedIncomeChartData(
  filters: IncomeChartFilters = {},
  offset = 0,
): Promise<IncomeFixedChartData> {
  const incomes = await client.income.findMany({
    where: buildIncomeWhere({...filters, isRecurring: true}),
    include: {frequency: true},
  });

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

  return {
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), MONTH_LOOKBACK, upcomingTotalsByDay, today),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), YEAR_LOOKBACK, upcomingTotalsByDay, today),
  };
}
