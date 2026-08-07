import {client} from "@/lib/prisma";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import type {DonutSlice} from "@/features/dashboard/lib/donut";

// Active recurring contracts grouped by contract category, each normalized to a MONTHLY figure:
//   monthly = totalAmount × frequency.value / 12   (value = payments per year; yearly→/12, monthly→×1)
// so a €1,200/yr and a €100/mo contract both read as €100/month. One-time (non-recurring) contracts
// are excluded — a single charge has no monthly rate. Sorted by monthly total desc. `workspaceId`
// scopes to the active account (undefined = all accounts).
export async function getContractCategoryMonthly(filters: ContractFilters = {}): Promise<DonutSlice[]> {
  const contracts = await client.contract.findMany({
    where: {
      AND: [buildContractWhere({...filters, status: "Active"}), {frequency: {isRecurring: true}}],
    },
    select: {
      categoryId: true,
      totalAmount: true,
      category: {select: {name: true}},
      frequency: {select: {value: true}},
    },
  });

  const byCategory = new Map<number, DonutSlice>();
  for (const contract of contracts) {
    const monthly = (Number(contract.totalAmount) * contract.frequency.value) / 12;
    const current = byCategory.get(contract.categoryId) ?? {
      id: contract.categoryId,
      label: contract.category.name,
      amount: 0,
      count: 0,
    };
    current.amount += monthly;
    current.count += 1;
    byCategory.set(contract.categoryId, current);
  }

  return [...byCategory.values()].sort((a, b) => b.amount - a.amount);
}
