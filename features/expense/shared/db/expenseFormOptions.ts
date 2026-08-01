import {client} from "@/lib/prisma";

export type FilterOption = {id: number; name: string};

export type ExpenseFormOptions = {
  suppliers: FilterOption[];
  itemCategories: FilterOption[];
  contractCategories: FilterOption[];
  frequencies: FilterOption[];
};

// Options for the unified Add form (both Variable/Bill and Fixed/Contract branches). Offers
// every supplier/category/frequency (not domain-scoped like the filter options) so a new
// expense of either kind can reference any of them. Frequencies are value-sorted (One-time,
// Yearly, Quarterly, Monthly by billing-per-year) to match the edit-form ordering.
export async function getExpenseFormOptions(): Promise<ExpenseFormOptions> {
  const [suppliers, itemCategories, contractCategories, frequencies] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.itemCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
  ]);

  return {suppliers, itemCategories, contractCategories, frequencies};
}
