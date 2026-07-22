import {client} from "@/lib/prisma";

export type FilterOption = {id: number; name: string};

export type ContractFilterOptions = {
  suppliers: FilterOption[];
  categories: FilterOption[];
  frequencies: FilterOption[];
};

export async function getContractFilterOptions(): Promise<ContractFilterOptions> {
  const [suppliers, categories, frequencies] = await Promise.all([
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true}, orderBy: {value: "asc"}}),
  ]);

  return {suppliers, categories, frequencies};
}
