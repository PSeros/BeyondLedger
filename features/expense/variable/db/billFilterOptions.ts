import {client} from "@/lib/prisma";
import type {TagOption} from "@/features/tags/types";

export type FilterOption = {id: number; name: string};

export type BillFilterOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  itemCategories: FilterOption[];
  tags: TagOption[];
};

// Only offer values that actually occur on a Bill — a supplier/category/tag with no bills
// would be a dead filter option (it exists in the schema but not in this domain).
export async function getBillFilterOptions(): Promise<BillFilterOptions> {
  const [suppliers, supplierCategories, itemCategories, tags] = await Promise.all([
    client.supplier.findMany({
      where: {bills: {some: {}}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.supplierCategory.findMany({
      where: {suppliers: {some: {bills: {some: {}}}}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.itemCategory.findMany({
      where: {items: {some: {}}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.tag.findMany({
      where: {entries: {some: {billId: {not: null}}}},
      select: {id: true, name: true, color: true},
      orderBy: {name: "asc"},
    }),
  ]);

  return {suppliers, supplierCategories, itemCategories, tags};
}
