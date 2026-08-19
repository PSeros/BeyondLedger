import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
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
import type {BillChartData} from "@/features/expense/variable/types";

// How many past periods feed the "previous" (average) line is a user setting (AppSettings.lookback*)
// — a rolling window rather than the whole dataset, so the reference pace reacts to recent behavior.
// It is only a ceiling: periods older than the first matching bill are dropped rather than averaged
// in as zeros, so a young (or narrowly filtered) dataset is not diluted.

// Chart intentionally ignores the date range (dateFrom/dateTo): its 1W/1M/1Y views are a
// cumulative "this period vs. rolling average of prior periods" comparison. `offset` (from the
// period navigator's ?co param) shifts the anchor back/forward by N of each granularity's own unit
// while `today` stays the realized/forecast boundary, so a past period fills fully and a future one
// forecasts. Only the categorical filters apply here.
type GetVariableExpenseChartDataInput = Omit<BillFilters, "dateFrom" | "dateTo">;

export async function getVariableExpenseChartData(
  filters: GetVariableExpenseChartDataInput = {},
  offset = 0,
): Promise<BillChartData> {
  const [bills, lookback] = await Promise.all([
    client.bill.findMany({
      where: buildBillWhere(filters),
      select: {date: true, totalAmount: true},
    }),
    getLookback(),
  ]);

  const totalsByDay = new Map<string, number>();
  for (const bill of bills) {
    const key = dateKey(bill.date);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(bill.totalAmount));
  }

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  // Derived from the (unbounded, already-filtered) result set, so the horizon reflects exactly the
  // bills this chart draws — including the categorical filters, not just the account.
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
