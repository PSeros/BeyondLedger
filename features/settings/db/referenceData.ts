import {client} from "@/lib/prisma";

// Read side for the /settings reference-data manager. Every row carries a usage count so the UI
// can disable deleting a row that's still referenced by an expense (deleting one would fail the
// FK constraint anyway — this just surfaces it up front).

export type SupplierRow = {id: number; name: string; categoryId: number; categoryName: string; usage: number};
export type CategoryRow = {id: number; name: string; usage: number};
export type FrequencyRow = {id: number; name: string; value: number; isRecurring: boolean; usage: number};

export type ReferenceData = {
  suppliers: SupplierRow[];
  supplierCategories: CategoryRow[];
  itemCategories: CategoryRow[];
  contractCategories: CategoryRow[];
  incomeSources: CategoryRow[];
  incomeCategories: CategoryRow[];
  frequencies: FrequencyRow[];
};

export async function getReferenceData(): Promise<ReferenceData> {
  const [
    suppliers,
    supplierCategories,
    itemCategories,
    contractCategories,
    incomeSources,
    incomeCategories,
    frequencies,
  ] = await Promise.all([
    client.supplier.findMany({
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: {select: {name: true}},
        _count: {select: {bills: true, contracts: true}},
      },
      orderBy: {name: "asc"},
    }),
    client.supplierCategory.findMany({
      select: {id: true, name: true, _count: {select: {suppliers: true}}},
      orderBy: {name: "asc"},
    }),
    client.itemCategory.findMany({
      select: {id: true, name: true, _count: {select: {items: true}}},
      orderBy: {name: "asc"},
    }),
    client.contractCategory.findMany({
      select: {id: true, name: true, _count: {select: {contracts: true}}},
      orderBy: {name: "asc"},
    }),
    client.incomeSource.findMany({
      select: {id: true, name: true, _count: {select: {incomes: true}}},
      orderBy: {name: "asc"},
    }),
    client.incomeCategory.findMany({
      select: {id: true, name: true, _count: {select: {incomes: true}}},
      orderBy: {name: "asc"},
    }),
    client.frequency.findMany({
      select: {id: true, name: true, value: true, isRecurring: true, _count: {select: {contracts: true, incomes: true}}},
      orderBy: {value: "asc"},
    }),
  ]);

  return {
    suppliers: suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      categoryId: s.categoryId,
      categoryName: s.category.name,
      usage: s._count.bills + s._count.contracts,
    })),
    supplierCategories: supplierCategories.map((c) => ({id: c.id, name: c.name, usage: c._count.suppliers})),
    itemCategories: itemCategories.map((c) => ({id: c.id, name: c.name, usage: c._count.items})),
    contractCategories: contractCategories.map((c) => ({id: c.id, name: c.name, usage: c._count.contracts})),
    incomeSources: incomeSources.map((c) => ({id: c.id, name: c.name, usage: c._count.incomes})),
    incomeCategories: incomeCategories.map((c) => ({id: c.id, name: c.name, usage: c._count.incomes})),
    frequencies: frequencies.map((f) => ({
      id: f.id,
      name: f.name,
      value: f.value,
      isRecurring: f.isRecurring,
      usage: f._count.contracts + f._count.incomes,
    })),
  };
}
