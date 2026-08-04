import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/fixed/db/contractFilterOptions";
import type {TagOption} from "@/features/tags/types";

export type ContractFormOptions = {
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
};

// Unlike the filter options (scoped to values already used by contracts), the edit form must
// offer every supplier/category/frequency so a contract can be reassigned to any of them.
// `supplierCategories` feeds the inline "create a new supplier" popover (a new supplier needs one).
export async function getContractFormOptions(): Promise<ContractFormOptions> {
  const [suppliers, supplierCategories, categories, frequencies, tags] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
  ]);

  return {suppliers, supplierCategories, categories, frequencies, tags};
}
