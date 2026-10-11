import {client} from "@/lib/prisma";
import type {TagOption} from "@/features/tags/types";

export type FilterOption = {id: number; name: string};

export type SavingFilterOptions = {
  targets: FilterOption[];
  // Fixed tab only — the variable tab is always the One-time frequency, so a frequency filter
  // there would be a single dead option. Empty for the variable tab.
  frequencies: FilterOption[];
  tags: TagOption[];
};

// Only offer values that actually occur on a saving of the current tab.
export async function getSavingFilterOptions(isRecurring: boolean): Promise<SavingFilterOptions> {
  const scope = {frequency: {isRecurring}};

  const [targets, frequencies, tags] = await Promise.all([
    client.savingTarget.findMany({
      where: {savings: {some: scope}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    isRecurring
      ? client.frequency.findMany({
          where: {isRecurring: true, savings: {some: {}}},
          select: {id: true, name: true},
          orderBy: {value: "asc"},
        })
      : Promise.resolve([] as FilterOption[]),
    client.tag.findMany({
      where: {entries: {some: {saving: scope}}},
      select: {id: true, name: true, color: true},
      orderBy: {name: "asc"},
    }),
  ]);

  return {targets, frequencies, tags};
}
