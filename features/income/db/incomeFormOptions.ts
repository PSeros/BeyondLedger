import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {TagOption} from "@/features/tags/types";

export type IncomeFormOptions = {
  sources: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
};

// Unlike the filter options (scoped to values already used by income of one tab), the add/edit form
// offers every source/category/frequency so an income can be assigned to any of them — and the
// chosen frequency's isRecurring decides which tab the row lands in.
export async function getIncomeFormOptions(): Promise<IncomeFormOptions> {
  const [sources, categories, frequencies, tags] = await Promise.all([
    client.incomeSource.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.incomeCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
  ]);

  return {sources, categories, frequencies, tags};
}
