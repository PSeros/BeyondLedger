import {client} from "@/lib/prisma";

export type BillItemDetail = {
  id: number;
  name: string;
  category: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: number | null;
};

export type BillDetailData = {
  id: number;
  supplier: string;
  supplierId: number;
  supplierCategory: string;
  documentNumber: string | null;
  amount: number;
  date: string; // ISO
  notes: string | null;
  items: BillItemDetail[];
};

export async function getBillById(id: number): Promise<BillDetailData | null> {
  const bill = await client.bill.findUnique({
    where: {id},
    include: {
      supplier: {include: {category: true}},
      items: {include: {category: true}, orderBy: {createdAt: "asc"}},
    },
  });

  if (!bill) {
    return null;
  }

  return {
    id: bill.id,
    supplier: bill.supplier.name,
    supplierId: bill.supplierId,
    supplierCategory: bill.supplier.category.name,
    documentNumber: bill.documentNumber,
    amount: Number(bill.totalAmount),
    date: bill.date.toISOString(),
    notes: bill.markdown,
    items: bill.items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category.name,
      categoryId: item.categoryId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      warranty: item.warranty,
    })),
  };
}
