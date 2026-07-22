import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
import {addDays, average, buildMonthView, buildYearView, dateKey, sumRange, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import type {BillChartData, BillChartPoint} from "@/features/expense/variable/types";

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// How many past complete periods feed the "previous" (average) line — a rolling window
// rather than the whole dataset, so the reference pace reacts to recent behavior.
const WEEK_LOOKBACK = 8;
const MONTH_LOOKBACK = 6;
const YEAR_LOOKBACK = 3;

// Chart intentionally ignores the date range (dateFrom/dateTo): its 1W/1M/1Y views are a
// cumulative "this period vs. rolling average of prior periods" comparison anchored on today,
// so an arbitrary window would starve the baseline. Only the categorical filters apply here.
type GetVariableExpenseChartDataInput = Omit<BillFilters, "dateFrom" | "dateTo">;

export async function getVariableExpenseChartData(filters: GetVariableExpenseChartDataInput = {}): Promise<BillChartData> {
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
    "1W": buildWeekView(totalsByDay, today),
    "1M": buildMonthView(totalsByDay, today, MONTH_LOOKBACK),
    "1Y": buildYearView(totalsByDay, today, YEAR_LOOKBACK),
  };
}

function buildWeekView(totalsByDay: Map<string, number>, today: Date): BillChartPoint[] {
  const todayIndex = (today.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  const weekStart = addDays(today, -todayIndex);

  return WEEKDAY_LABELS.map((label, index) => {
    const current = index <= todayIndex ? sumRange(totalsByDay, weekStart, index + 1) : null;

    const historical: number[] = [];
    for (let w = 1; w <= WEEK_LOOKBACK; w++) {
      historical.push(sumRange(totalsByDay, addDays(weekStart, -7 * w), index + 1));
    }

    return {label, current, previous: average(historical)};
  });
}
