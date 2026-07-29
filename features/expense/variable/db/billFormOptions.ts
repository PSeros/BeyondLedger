import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";

export type BillFormOptions = {
  suppliers: FilterOption[];
  itemCategories: FilterOption[];
};

// Unlike the filter options (scoped to suppliers/categories already used by bills), the edit
// form must offer every supplier and every item category so a bill can be reassigned to any
// supplier and its line items can use any category (including one not yet used by any item).
export async function getBillFormOptions(): Promise<BillFormOptions> {
  const [suppliers, itemCategories] = await Promise.all([
    client.supplier.findMany({
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.itemCategory.findMany({
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
  ]);

  return {suppliers, itemCategories};
}
