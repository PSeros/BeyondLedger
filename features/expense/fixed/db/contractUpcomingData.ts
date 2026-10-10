import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {nextOccurrence} from "@/features/expense/shared/db/recurrence";
import type {ContractUpcomingRow} from "@/features/expense/fixed/types";

// Upcoming card restricts to Active contracts by nature, so status is not applicable here.
type GetUpcomingFixedExpensesInput = Omit<ContractFilters, "status"> & {
  withinDays?: number;
};

export async function getUpcomingFixedExpenses({
  withinDays = 30,
  ...filters
}: GetUpcomingFixedExpensesInput = {}): Promise<ContractUpcomingRow[]> {
  const contracts = await client.contract.findMany({
    where: buildContractWhere(filters),
    include: {frequency: true},
  });

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const horizon = addDays(today, withinDays);

  const upcoming: ContractUpcomingRow[] = [];

  for (const contract of contracts) {
    if (determineStatus(contract) !== "Active") {
      continue;
    }

    // First projected billing date on/after today; null once the contract's endDate has passed.
    const occurrence = nextOccurrence(
      {
        startDate: contract.startDate,
        endDate: contract.endDate,
        frequencyValue: contract.frequency.value,
      },
      today,
    );

    if (!occurrence || occurrence > horizon) {
      continue;
    }

    upcoming.push({
      id: contract.id,
      label: contract.name,
      amount: Number(contract.totalAmount),
      dueDate: occurrence.toISOString(),
      frequency: contract.frequency.name,
    });
  }

  return upcoming.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
