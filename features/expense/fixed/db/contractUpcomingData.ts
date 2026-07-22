import {client} from "@/lib/prisma";
import {determineStatus} from "@/lib/status";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
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

    const monthsBetween = 12 / contract.frequency.value;

    let step = 0;
    let occurrence = utcDate(
      contract.startDate.getUTCFullYear(),
      contract.startDate.getUTCMonth(),
      contract.startDate.getUTCDate(),
    );

    // Advance to the first projected billing date on/after today.
    while (occurrence < today) {
      step += 1;
      occurrence = utcDate(
        contract.startDate.getUTCFullYear(),
        contract.startDate.getUTCMonth() + step * monthsBetween,
        contract.startDate.getUTCDate(),
      );
    }

    if (occurrence > horizon) {
      continue;
    }

    if (contract.endDate && occurrence > contract.endDate) {
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
