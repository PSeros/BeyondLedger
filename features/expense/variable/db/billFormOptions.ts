import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";
import type {TagOption} from "@/features/tags/types";

export type BillFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  itemCategories: FilterOption[];
  tags: TagOption[];
};

// Unlike the filter options (scoped to suppliers/categories already used by bills), the edit
// form must offer every supplier and every item category so a bill can be reassigned to any
// supplier and its line items can use any category (including one not yet used by any item).
// `supplierCategories` feeds the inline "create a new supplier" popover (a new supplier needs one).
export async function getBillFormOptions(): Promise<BillFormOptions> {
  const [suppliers, supplierCategories, itemCategories, tags] = await Promise.all([
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
  ]);

  return {suppliers, supplierCategories, itemCategories, tags};
}
