import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildIncomeWhere, type IncomeFilters} from "@/features/income/db/incomeWhere";
import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import type {IncomeUpcomingRow} from "@/features/income/types";

// The fixed (recurring) tab's second card: the next projected payout per Active recurring income
// within the horizon — "what's coming in next" (mirrors the expense route's Upcoming due card).
type GetUpcomingFixedIncomeInput = Omit<IncomeFilters, "status" | "dateFrom" | "dateTo" | "isRecurring"> & {
  withinDays?: number;
};

export async function getUpcomingFixedIncome({
  withinDays = 30,
  ...filters
}: GetUpcomingFixedIncomeInput = {}): Promise<IncomeUpcomingRow[]> {
  const incomes = await client.income.findMany({
    where: buildIncomeWhere({...filters, isRecurring: true}),
    include: {frequency: true},
  });

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const horizon = addDays(today, withinDays);

  const upcoming: IncomeUpcomingRow[] = [];

  for (const income of incomes) {
    if (determineStatus(income) !== "Active") {
      continue;
    }

    const monthsBetween = 12 / income.frequency.value;

    let step = 0;
    let occurrence = utcDate(
      income.startDate.getUTCFullYear(),
      income.startDate.getUTCMonth(),
      income.startDate.getUTCDate(),
    );

    while (occurrence < today) {
      step += 1;
      occurrence = utcDate(
        income.startDate.getUTCFullYear(),
        income.startDate.getUTCMonth() + step * monthsBetween,
        income.startDate.getUTCDate(),
      );
    }

    if (occurrence > horizon) {
      continue;
    }

    if (income.endDate && occurrence > income.endDate) {
      continue;
    }

    upcoming.push({
      id: income.id,
      label: income.name,
      amount: Number(income.totalAmount),
      dueDate: occurrence.toISOString(),
      frequency: income.frequency.name,
    });
  }

  return upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
