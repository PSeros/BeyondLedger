import {client} from "@/lib/prisma";
import {buildIncomeWhere, type IncomeFilters} from "@/features/income/db/incomeWhere";
import type {IncomeTopKRow} from "@/features/income/types";

// Top-K is the variable (one-time) tab's second card (the fixed tab uses an Upcoming card instead,
// mirroring the expense route). Both rankings force isRecurring:false so they cover one-time income.
type GetTopKInput = Omit<IncomeFilters, "isRecurring"> & {
  limit?: number;
};

// Ranks income sources by total amount — "where the money comes from".
export async function getTopSources({limit = 5, ...filters}: GetTopKInput = {}): Promise<IncomeTopKRow[]> {
  const grouped = await client.income.groupBy({
    by: ["sourceId"],
    where: buildIncomeWhere({...filters, isRecurring: false}),
    _sum: {totalAmount: true},
    _count: {_all: true},
    orderBy: {_sum: {totalAmount: "desc"}},
    take: limit,
  });

  const sources = await client.incomeSource.findMany({
    where: {id: {in: grouped.map((group) => group.sourceId)}},
    select: {id: true, name: true},
  });
  const nameById = new Map(sources.map((source) => [source.id, source.name]));

  return grouped.map((group) => ({
    id: group.sourceId,
    label: nameById.get(group.sourceId) ?? "—",
    amount: Number(group._sum.totalAmount ?? 0),
    count: group._count._all,
  }));
}

// Ranks income categories by total amount — "what kind of income" (Erstattung, Nebeneinkünfte …).
export async function getTopCategories({limit = 5, ...filters}: GetTopKInput = {}): Promise<IncomeTopKRow[]> {
  const grouped = await client.income.groupBy({
    by: ["categoryId"],
    where: buildIncomeWhere({...filters, isRecurring: false}),
    _sum: {totalAmount: true},
    _count: {_all: true},
    orderBy: {_sum: {totalAmount: "desc"}},
    take: limit,
  });

  const categories = await client.incomeCategory.findMany({
    where: {id: {in: grouped.map((group) => group.categoryId)}},
    select: {id: true, name: true},
  });
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return grouped.map((group) => ({
    id: group.categoryId,
    label: nameById.get(group.categoryId) ?? "—",
    amount: Number(group._sum.totalAmount ?? 0),
    count: group._count._all,
  }));
}
