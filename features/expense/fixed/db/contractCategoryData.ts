import {client} from "@/lib/prisma";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {countOccurrences, type DateWindow} from "@/features/expense/shared/db/cumulativeChart";
import type {DonutSlice} from "@/features/dashboard/lib/donut";

// Fixed costs actually incurred within [start, end), grouped by contract category, for the dashboard
// donut. Recurring contracts contribute one `totalAmount` per billing occurrence that lands in the
// window (clamped to the contract's own lifetime); one-time contracts contribute once if their single
// charge falls in the window. Unlike the old monthly-run-rate view this follows the selected period,
// so a Week window shows a week's worth of charges. `workspaceId` (via filters) scopes to the active
// account.
export async function getContractCategorySpend(
  filters: ContractFilters = {},
  window: DateWindow,
): Promise<DonutSlice[]> {
  const [recurring, oneTime] = await Promise.all([
    client.contract.findMany({
      where: {AND: [buildContractWhere(filters), {frequency: {isRecurring: true}}]},
      select: {
        categoryId: true,
        totalAmount: true,
        startDate: true,
        endDate: true,
        category: {select: {name: true}},
        frequency: {select: {value: true}},
      },
    }),
    client.contract.findMany({
      where: {
        AND: [
          buildContractWhere(filters),
          {frequency: {isRecurring: false}},
          {startDate: {gte: window.start, lt: window.end}},
        ],
      },
      select: {categoryId: true, totalAmount: true, category: {select: {name: true}}},
    }),
  ]);

  const byCategory = new Map<number, DonutSlice>();
  const add = (categoryId: number, name: string, amount: number) => {
    const current = byCategory.get(categoryId) ?? {id: categoryId, label: name, amount: 0, count: 0};
    current.amount += amount;
    current.count += 1;
    byCategory.set(categoryId, current);
  };

  for (const contract of recurring) {
    const occurrences = countOccurrences(
      {startDate: contract.startDate, endDate: contract.endDate, frequencyValue: contract.frequency.value},
      window.start,
      window.end,
    );
    if (occurrences > 0) {
      add(contract.categoryId, contract.category.name, Number(contract.totalAmount) * occurrences);
    }
  }
  for (const contract of oneTime) {
    add(contract.categoryId, contract.category.name, Number(contract.totalAmount));
  }

  return [...byCategory.values()].sort((a, b) => b.amount - a.amount);
}
