import {client} from "@/lib/prisma";

type BillTableRow = {
  id: string;
  supplier: string;
  supplierCategory: string;
  amount: number;
  date: string;
};

type GetBillTableDataInput = {
  q?: string;
  offset?: number;
  limit?: number;
};

export async function getBillTableData({
  q = "",
  offset = 0,
  limit = 10,
}: GetBillTableDataInput): Promise<{
  data: BillTableRow[];
  nextOffset: number | null;
}> {
  return client.bill.findMany({
    take: 50, // TODO Just for now
    include: {
      supplier: {
        include: {
          category: true
        },
      },
      items: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
