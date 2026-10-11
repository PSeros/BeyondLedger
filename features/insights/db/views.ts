import {client} from "@/lib/prisma";
import {dropUnknownIds, parseInsightsQuery, serializeViewQuery, type ValidIds} from "@/features/insights/params";
import type {InsightsFilterOptions} from "@/features/insights/components/InsightsControls";

export type SavedView = {id: number; name: string; query: string};

export function validIdsFrom(options: InsightsFilterOptions): ValidIds {
  const ids = (list: {id: number}[]) => new Set(list.map((option) => option.id));
  return {
    itemCategoryIds: ids(options.itemCategories),
    contractCategoryIds: ids(options.contractCategories),
    supplierCategoryIds: ids(options.supplierCategories),
    supplierIds: ids(options.suppliers),
    tagIds: ids(options.tags),
    incomeCategoryIds: ids(options.incomeCategories),
    incomeSourceIds: ids(options.incomeSources),
    savingTargetIds: ids(options.savingTargets),
  };
}

// Saved views with their query cleaned of ids deleted since, so opening one never puts a dangling
// filter into the URL.
export async function getSavedViews(options: InsightsFilterOptions): Promise<SavedView[]> {
  const views = await client.insightsView.findMany({orderBy: {name: "asc"}});
  const valid = validIdsFrom(options);
  return views.map((view) => ({
    id: view.id,
    name: view.name,
    query: serializeViewQuery(dropUnknownIds(parseInsightsQuery(new URLSearchParams(view.query)), valid)),
  }));
}
