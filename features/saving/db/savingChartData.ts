import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildSavingWhere, type SavingFilters} from "@/features/saving/db/savingWhere";
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
import type {SavingFixedChartData, SavingVariableChartData} from "@/features/saving/types";

// Same cumulative "this period vs. Ø of prior periods" chart as income (see incomeChartData). Ignores
// the date range and status; only categorical filters + the tab apply.
export type SavingChartFilters = Omit<SavingFilters, "status" | "dateFrom" | "dateTo" | "isRecurring">;

// One-offs (deposits net of withdrawals) on their real dates, with a weekday view.
export async function getVariableSavingChartData(
  filters: SavingChartFilters = {},
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<SavingVariableChartData> {
  const [savings, baseline] = await Promise.all([
    client.saving.findMany({
      where: buildSavingWhere({...filters, isRecurring: false}),
      select: {startDate: true, totalAmount: true},
    }),
    getBaseline(),
  ]);

  const totalsByDay = new Map<string, number>();
  for (const saving of savings) {
    const key = dateKey(saving.startDate);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(saving.totalAmount));
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

// Plans projected from startDate/frequency/endDate; occurrences past today feed the forecast line.
export async function getFixedSavingChartData(
  filters: SavingChartFilters = {},
  offset = 0,
  mode: ChartMode = "cumulative",
): Promise<SavingFixedChartData> {
  const [savings, baseline] = await Promise.all([
    client.saving.findMany({
      where: buildSavingWhere({...filters, isRecurring: true}),
      include: {frequency: true},
    }),
    getBaseline(),
  ]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const projectionHorizon = utcDate(today.getUTCFullYear(), 11, 31);

  const active = savings.filter((saving) => determineStatus(saving) === "Active");

  // fitsGranularity drops plans whose interval is longer than the view's period.
  const streamFor = (granularity: "1M" | "1Y") => {
    const totalsByDay = new Map<string, number>();
    const upcomingTotalsByDay = new Map<string, number>();
    for (const saving of active) {
      if (!fitsGranularity(saving.frequency, granularity)) continue;
      const amount = Number(saving.totalAmount);
      forEachOccurrence(
        {startDate: saving.startDate, endDate: saving.endDate, frequency: saving.frequency},
        saving.startDate,
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
