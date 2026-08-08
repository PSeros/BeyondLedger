import {client} from "@/lib/prisma";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";

export type FilterOption = {id: number; name: string};

export type ExpenseFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  itemCategories: FilterOption[];
  contractCategories: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
  workspaces: WorkspaceOption[];
  // The account a NEW bill/contract defaults to: the active account (or Shared when "All" is active).
  defaultWorkspaceId: string;
};

// Options for the unified Add form (both Variable/Bill and Fixed/Contract branches). Offers
// every supplier/category/frequency (not domain-scoped like the filter options) so a new
// expense of either kind can reference any of them. `supplierCategories` feeds the inline
// "create a new supplier" popover (a new supplier needs a category). Frequencies are
// value-sorted (Yearly, Semi-annually, Quarterly, Monthly by billing-per-year) and recurring
// only — a one-off expense is a Bill, so the one-time frequency is Income-only.
export async function getExpenseFormOptions(): Promise<ExpenseFormOptions> {
  const [suppliers, supplierCategories, itemCategories, contractCategories, frequencies, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.itemCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({where: {isRecurring: true}, select: {id: true, name: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return {
    suppliers,
    supplierCategories,
    itemCategories,
    contractCategories,
    frequencies,
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}
