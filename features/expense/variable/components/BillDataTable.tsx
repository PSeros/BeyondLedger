"use client";

import {useMemo} from "react";
import DataTable from "@/components/DataTable";
import {useBillFilterStore} from "@/features/expense/variable/store/billFilterStore";

type BillDataTableItem = {
  id: number;
  supplier: string;
  supplierCategory: string;
  documentNumber: string;
  totalAmount: number;
  date: string;
  itemNames: string[];
  itemCategories: string[];
};

type BillDataTableProps = {
  bills: BillDataTableItem[];
};

function includesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search);
}

export default function BillDataTable({bills}: BillDataTableProps) {
  const search = useBillFilterStore((state) => state.search);
  const supplier = useBillFilterStore((state) => state.supplier);
  const supplierCategory = useBillFilterStore((state) => state.supplierCategory);
  const itemCategory = useBillFilterStore((state) => state.itemCategory);

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();

    return bills.filter((bill) => {
      const matchesSearch =
        !q ||
        includesSearch(bill.supplier, q) ||
        includesSearch(bill.supplierCategory, q) ||
        includesSearch(bill.documentNumber, q) ||
        includesSearch(bill.totalAmount.toString(), q) ||
        bill.itemNames.some((name) => includesSearch(name, q)) ||
        bill.itemCategories.some((category) => includesSearch(category, q));

      const matchesSupplier =
        !supplier || bill.supplier === supplier;

      const matchesSupplierCategory =
        !supplierCategory || bill.supplierCategory === supplierCategory;

      const matchesItemCategory =
        !itemCategory || bill.itemCategories.includes(itemCategory);

      return matchesSearch && matchesSupplier && matchesSupplierCategory && matchesItemCategory;
    });
  }, [bills, itemCategory, search, supplier, supplierCategory]);

  const rows = filteredBills.map((bill) => ({
    id: bill.id,
    supplier: bill.supplier,
    category: bill.supplierCategory,
    totalAmount: bill.totalAmount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    }),
    date: new Date(bill.date).toLocaleString("de-DE", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }),
  }));

  const columns = [
    {id: "supplier", name: "Supplier", isRowHeader: true},
    {id: "category", name: "Category"},
    {id: "totalAmount", name: "Total"},
    {id: "date", name: "Date"},
  ] as const;

  return (
    <DataTable
      ariaLabel="Variable expenses"
      columns={columns}
      rows={rows}
    />
  );
}
