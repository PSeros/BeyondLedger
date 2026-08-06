import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import {buildContractWhere} from "@/features/expense/fixed/db/contractWhere";
import {buildIncomeWhere} from "@/features/income/db/incomeWhere";
import {daysBetween, dateKey, sumRange, utcDate} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard KPI row (Phase 12): total money IN (income), OUT (expense = variable bills + fixed
// contracts) and NET for the current calendar month vs. the previous one, so StatCard can show the
// month-over-month delta. Recurring contracts/income have no per-occurrence row, so their billing
// dates are projected into the window (same approach as the chart builders); one-time bills/income
// use their real dates. All streams honor the active account (workspaceId) filter.

export type KpiPair = {current: number; previous: number};

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

export async function getMonthlyKpis(workspaceId?: number | null): Promise<DashboardKpis> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const currentMonthStart = utcDate(year, month, 1);
  const nextMonthStart = utcDate(year, month + 1, 1);
  const prevMonthStart = utcDate(year, month - 1, 1);
  const daysCurrent = daysBetween(currentMonthStart, nextMonthStart);
  const daysPrevious = daysBetween(prevMonthStart, currentMonthStart);

  const wsFilter = workspaceId != null ? {workspaceId} : {};

  const [bills, contracts, variableIncome, fixedIncome] = await Promise.all([
    client.bill.findMany({
      where: {AND: [buildBillWhere(wsFilter), {date: {gte: prevMonthStart, lt: nextMonthStart}}]},
      select: {date: true, totalAmount: true},
    }),
    client.contract.findMany({
      where: buildContractWhere(wsFilter),
      include: {frequency: true},
    }),
    client.income.findMany({
      where: {
        AND: [
          buildIncomeWhere({...wsFilter, isRecurring: false}),
          {startDate: {gte: prevMonthStart, lt: nextMonthStart}},
        ],
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
  for (const contract of contracts) {
    if (determineStatus(contract) !== "Active") continue;
    projectRecurringInto(
      expenseMap,
      {
        startDate: contract.startDate,
        endDate: contract.endDate,
        amount: Number(contract.totalAmount),
        frequencyValue: contract.frequency.value,
      },
      prevMonthStart,
      nextMonthStart,
    );
  }

  const incomeMap = new Map<string, number>();
  for (const income of variableIncome) {
    const key = dateKey(income.startDate);
    incomeMap.set(key, (incomeMap.get(key) ?? 0) + Number(income.totalAmount));
  }
  for (const income of fixedIncome) {
    if (determineStatus(income) !== "Active") continue;
    projectRecurringInto(
      incomeMap,
      {
        startDate: income.startDate,
        endDate: income.endDate,
        amount: Number(income.totalAmount),
        frequencyValue: income.frequency.value,
      },
      prevMonthStart,
      nextMonthStart,
    );
  }

  const expense: KpiPair = {
    current: sumRange(expenseMap, currentMonthStart, daysCurrent),
    previous: sumRange(expenseMap, prevMonthStart, daysPrevious),
  };
  const income: KpiPair = {
    current: sumRange(incomeMap, currentMonthStart, daysCurrent),
    previous: sumRange(incomeMap, prevMonthStart, daysPrevious),
  };
  const net: KpiPair = {
    current: income.current - expense.current,
    previous: income.previous - expense.previous,
  };

  return {income, expense, net};
}
