import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
import {
  addDays,
  addMonths,
  buildMonthView,
  buildWeekView,
  buildYearView,
  dateKey,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";
import type {BillChartData} from "@/features/expense/variable/types";

// How many past complete periods feed the "previous" (average) line — a rolling window
// rather than the whole dataset, so the reference pace reacts to recent behavior.
const WEEK_LOOKBACK = 8;
const MONTH_LOOKBACK = 6;
const YEAR_LOOKBACK = 3;

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
  const bills = await client.bill.findMany({
    where: buildBillWhere(filters),
    select: {date: true, totalAmount: true},
  });

  const totalsByDay = new Map<string, number>();
  for (const bill of bills) {
    const key = dateKey(bill.date);
    totalsByDay.set(key, (totalsByDay.get(key) ?? 0) + Number(bill.totalAmount));
  }

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return {
    "1W": buildWeekView(totalsByDay, addDays(today, offset * 7), WEEK_LOOKBACK, today),
    "1M": buildMonthView(totalsByDay, addMonths(today, offset), MONTH_LOOKBACK, undefined, today),
    "1Y": buildYearView(totalsByDay, utcDate(today.getUTCFullYear() + offset, 0, 1), YEAR_LOOKBACK, undefined, today),
  };
}
