import {client} from "@/lib/prisma";
import type {Prisma} from "@/prisma/generated/client";
import type {BillTableResponse, BillTableRow, BillTableSortBy, BillTableSortDir} from "@/features/expense/variable/types";
import {buildBillWhere} from "@/features/expense/variable/db/billWhere";

type GetBillTableRowsInput = {
  q?: string;
  offset?: number;
  limit?: number;
  sortBy?: BillTableSortBy;
  sortDir?: BillTableSortDir;
};

function getBillOrderBy(
  sortBy: BillTableSortBy,
  sortDir: BillTableSortDir,
): Prisma.BillOrderByWithRelationInput[] {
  switch (sortBy) {
    case "supplier":
      return [{supplier: {name: sortDir}}, {id: "asc"}];
    case "amount":
      return [{totalAmount: sortDir}, {id: "asc"}];
    case "date":
    default:
      return [{date: sortDir}, {id: "asc"}];
  }
}

export async function getBillTableRows({
  q = "",
  offset = 0,
  limit = 40,
  sortBy = "date",
  sortDir = "desc",
}: GetBillTableRowsInput): Promise<BillTableResponse> {
  const bills = await client.bill.findMany({
    where: buildBillWhere(q),
    skip: offset,
    take: limit + 1,
    orderBy: getBillOrderBy(sortBy, sortDir),
    include: {
      supplier: {
        include: {
          category: true,
        },
      },
    },
  });

  const rows: BillTableRow[] = bills.slice(0, limit).map((bill) => ({
    id: bill.id,
    date: bill.date.toISOString(),
    supplier: bill.supplier.name,
    supplierCategory: bill.supplier.category.name,
    documentNumber: bill.documentNumber,
    amount: Number(bill.totalAmount),
  }));

  return {
    rows,
    nextOffset: bills.length > limit ? offset + limit : null,
  };
}
