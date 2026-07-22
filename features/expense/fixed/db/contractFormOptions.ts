import {client} from "@/lib/prisma";
import type {ContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";

// Unlike the filter options (scoped to values already used by contracts), the edit form must
// offer every supplier/category/frequency so a contract can be reassigned to any of them.
export async function getContractFormOptions(): Promise<ContractFilterOptions> {
  const [suppliers, categories, frequencies] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
  ]);

  return {suppliers, categories, frequencies};
}
