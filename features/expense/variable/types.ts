import type {ChartPoint} from "@/features/expense/shared/db/cumulativeChart";

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

export type BillChartGranularity = "1W" | "1M" | "1Y";

export type BillChartPoint = ChartPoint;

export type BillChartData = Record<BillChartGranularity, BillChartPoint[]>;

export type BillTopKRow = {
  id: number;
  label: string;
  amount: number;
  count: number;
};
