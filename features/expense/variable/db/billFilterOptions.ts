import {client} from "@/lib/prisma";

export type FilterOption = {id: number; name: string};

export type BillFilterOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  itemCategories: FilterOption[];
};

export async function getBillFilterOptions(): Promise<BillFilterOptions> {
  const [suppliers, supplierCategories, itemCategories] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.itemCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
  ]);

  return {suppliers, supplierCategories, itemCategories};
}
