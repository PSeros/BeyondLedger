import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";

export type BillFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  itemCategories: FilterOption[];
  tags: TagOption[];
  workspaces: WorkspaceOption[];
  // The account a NEW bill defaults to: the active account, or Shared when "All accounts" is active.
  // The edit form overrides this with the bill's own account.
  defaultWorkspaceId: string;
};

// Unlike the filter options (scoped to suppliers/categories already used by bills), the edit
// form must offer every supplier and every item category so a bill can be reassigned to any
// supplier and its line items can use any category (including one not yet used by any item).
// `supplierCategories` feeds the inline "create a new supplier" popover (a new supplier needs one).
export async function getBillFormOptions(): Promise<BillFormOptions> {
  const [suppliers, supplierCategories, itemCategories, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.supplier.findMany({
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.supplierCategory.findMany({
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.itemCategory.findMany({
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.tag.findMany({
      select: {id: true, name: true, color: true},
      orderBy: {name: "asc"},
    }),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return {
    suppliers,
    supplierCategories,
    itemCategories,
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}
