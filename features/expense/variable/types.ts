export type BillTableRow = {
  id: number;
  date: string; // ISO
  supplier: string;
  supplierCategory: string;
  documentNumber: string | null;
  amount: number;
};

export type BillTableSortBy = "date" | "supplier" | "amount";
export type BillTableSortDir = "asc" | "desc";

export type BillTableResponse = {
  rows: BillTableRow[];
  nextOffset: number | null;
};
