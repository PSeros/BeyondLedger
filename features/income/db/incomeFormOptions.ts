import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";

export type IncomeFormOptions = {
  sources: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
  workspaces: WorkspaceOption[];
  // The account a NEW income defaults to (the edit form overrides with the income's own account).
  defaultWorkspaceId: string;
};

// Unlike the filter options (scoped to values already used by income of one tab), the add/edit form
// offers every source/category/frequency so an income can be assigned to any of them — and the
// chosen frequency's isRecurring decides which tab the row lands in.
export async function getIncomeFormOptions(): Promise<IncomeFormOptions> {
  const [sources, categories, frequencies, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.incomeSource.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.incomeCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return {
    sources,
    categories,
    frequencies,
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}
