import {client} from "@/lib/prisma";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";
import type {BillTopKRow} from "@/features/expense/variable/types";

type GetTopSuppliersInput = {
  q?: string;
  limit?: number;
};

export async function getTopSuppliers({q, limit = 5}: GetTopSuppliersInput = {}): Promise<BillTopKRow[]> {
  const grouped = await client.bill.groupBy({
    by: ["supplierId"],
    where: buildBillWhere(q),
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
