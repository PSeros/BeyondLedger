import {client} from "@/lib/prisma";
import type {TagOption} from "@/features/tags/types";

export type FilterOption = {id: number; name: string};

export type IncomeFilterOptions = {
  sources: FilterOption[];
  categories: FilterOption[];
  // Fixed tab only — the variable tab is always the One-time frequency, so a frequency filter
  // there would be a single dead option. Empty for the variable tab.
  frequencies: FilterOption[];
  tags: TagOption[];
};

// Only offer values that actually occur on an income of the current tab (recurring vs one-time),
// so a source/category/tag used only by the other tab isn't a dead filter option here.
export async function getIncomeFilterOptions(isRecurring: boolean): Promise<IncomeFilterOptions> {
  const scope = {frequency: {isRecurring}};

  const [sources, categories, frequencies, tags] = await Promise.all([
    client.incomeSource.findMany({
      where: {incomes: {some: scope}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.incomeCategory.findMany({
      where: {incomes: {some: scope}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    isRecurring
      ? client.frequency.findMany({
          where: {isRecurring: true, incomes: {some: {}}},
          select: {id: true, name: true},
          orderBy: {value: "asc"},
        })
      : Promise.resolve([] as FilterOption[]),
    client.tag.findMany({
      where: {entries: {some: {income: scope}}},
      select: {id: true, name: true, color: true},
      orderBy: {name: "asc"},
    }),
  ]);

  return {sources, categories, frequencies, tags};
}
