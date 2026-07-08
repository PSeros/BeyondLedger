import {getBills} from "@/features/expense/variable/db";
import BillDataTable from "@/features/expense/variable/components/BillDataTable";

type BillTableProps = {
  bills: Awaited<ReturnType<typeof getBills>>;
};

export default function BillTable({bills}: BillTableProps) {
  const rows = bills.map((bill) => ({
    id: bill.id,
    supplier: bill.supplier.name,
    supplierCategory: bill.supplier.category.name,
    documentNumber: bill.documentNumber ?? "",
    totalAmount: Number(bill.totalAmount),
    date: bill.date.toISOString(),
    itemNames: bill.items.map((item) => item.name),
    itemCategories: bill.items.map((item) => item.category.name),
  }));

  return <BillDataTable bills={rows}/>;
}
