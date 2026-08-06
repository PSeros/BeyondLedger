import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/fixed/db/contractFilterOptions";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";

export type ContractFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
  workspaces: WorkspaceOption[];
  // The account a NEW contract defaults to (the edit form overrides with the contract's own account).
  defaultWorkspaceId: string;
};

// Unlike the filter options (scoped to values already used by contracts), the edit form must
// offer every supplier/category/frequency so a contract can be reassigned to any of them.
// `supplierCategories` feeds the inline "create a new supplier" popover (a new supplier needs one).
export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [suppliers, supplierCategories, categories, frequencies, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return {
    suppliers,
    supplierCategories,
    categories,
    frequencies,
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}
