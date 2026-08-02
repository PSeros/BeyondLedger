import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/fixed/db/contractFilterOptions";

export type ContractFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
};

// Unlike the filter options (scoped to values already used by contracts), the edit form must
// offer every supplier/category/frequency so a contract can be reassigned to any of them.
// `supplierCategories` feeds the inline "create a new supplier" popover (a new supplier needs one).
export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [suppliers, supplierCategories, categories, frequencies] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
  ]);

  return {suppliers, supplierCategories, categories, frequencies};
}
