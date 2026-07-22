import {client} from "@/lib/prisma";

export type FilterOption = {id: number; name: string};

export type ContractFilterOptions = {
  suppliers: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
};

// Only offer values that actually occur on a Contract — a supplier/frequency used only by
// bills or income would be a dead filter option in the fixed-expense domain.
export async function getContractFilterOptions(): Promise<ContractFilterOptions> {
  const [suppliers, categories, frequencies] = await Promise.all([
    client.supplier.findMany({
      where: {contracts: {some: {}}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.contractCategory.findMany({
      where: {contracts: {some: {}}},
      select: {id: true, name: true},
      orderBy: {name: "asc"},
    }),
    client.frequency.findMany({
      where: {contracts: {some: {}}},
      select: {id: true, name: true},
      orderBy: {value: "asc"},
    }),
  ]);

  return {suppliers, categories, frequencies};
}
