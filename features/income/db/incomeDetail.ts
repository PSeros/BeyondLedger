import {client} from "@/lib/prisma";
import {determineStatus, type LifecycleStatus} from "@/lib/status";
import type {TagOption} from "@/features/tags/types";

export type IncomeDetailData = {
  id: number;
  name: string;
  source: string;
  sourceId: number;
  category: string;
  categoryId: number;
  frequency: string;
  frequencyId: number;
  isRecurring: boolean;
  amount: number;
  startDate: string; // ISO
  endDate: string | null; // ISO
  status: LifecycleStatus;
  tags: TagOption[];
};

export async function getIncomeById(id: number): Promise<IncomeDetailData | null> {
  const income = await client.income.findUnique({
    where: {id},
    include: {source: true, category: true, frequency: true, tags: {include: {tag: true}}},
  });

  if (!income) {
    return null;
  }

  return {
    id: income.id,
    name: income.name,
    source: income.source.name,
    sourceId: income.sourceId,
    category: income.category.name,
    categoryId: income.categoryId,
    frequency: income.frequency.name,
    frequencyId: income.frequencyId,
    isRecurring: income.frequency.isRecurring,
    amount: Number(income.totalAmount),
    startDate: income.startDate.toISOString(),
    endDate: income.endDate ? income.endDate.toISOString() : null,
    status: determineStatus(income),
    tags: income.tags.map((entry) => ({id: entry.tag.id, name: entry.tag.name, color: entry.tag.color})),
  };
}
