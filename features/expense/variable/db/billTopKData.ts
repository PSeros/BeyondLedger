import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
import type {BillTopKRow} from "@/features/expense/variable/types";

type GetTopKInput = BillFilters & {
  limit?: number;
};

// Ranks suppliers by total Bill.totalAmount — "who do we pay the most".
export async function getTopSuppliers({limit = 5, ...filters}: GetTopKInput = {}): Promise<BillTopKRow[]> {
  const grouped = await client.bill.groupBy({
    by: ["supplierId"],
    where: buildBillWhere(filters),
    _sum: {totalAmount: true},
    _count: {_all: true},
    orderBy: {_sum: {totalAmount: "desc"}},
    take: limit,
  });

  const suppliers = await client.supplier.findMany({
    where: {id: {in: grouped.map((group) => group.supplierId)}},
    select: {id: true, name: true},
  });
  const supplierNameById = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));

  return grouped.map((group) => ({
    id: group.supplierId,
    label: supplierNameById.get(group.supplierId) ?? "—",
    amount: Number(group._sum.totalAmount ?? 0),
    count: group._count._all,
  }));
}

// Ranks item categories by total Item.totalPrice — "where the money actually goes"
// (Lebensmittel vs. Tanken vs. Gesundheit …), which supplier-ranking can't answer.
// Grouped over line items whose parent Bill matches the same filters as the table.
export async function getTopItemCategories({limit = 5, ...filters}: GetTopKInput = {}): Promise<BillTopKRow[]> {
  const grouped = await client.item.groupBy({
    by: ["categoryId"],
    where: {bill: buildBillWhere(filters)},
    _sum: {totalPrice: true},
    _count: {_all: true},
    orderBy: {_sum: {totalPrice: "desc"}},
    take: limit,
  });

  const categories = await client.itemCategory.findMany({
    where: {id: {in: grouped.map((group) => group.categoryId)}},
    select: {id: true, name: true},
  });
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return grouped.map((group) => ({
    id: group.categoryId,
    label: categoryNameById.get(group.categoryId) ?? "—",
    amount: Number(group._sum.totalPrice ?? 0),
    count: group._count._all,
  }));
}
