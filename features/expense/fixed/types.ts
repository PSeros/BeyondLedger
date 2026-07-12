import type {LifecycleStatus} from "@/lib/status";
import type {ChartPoint} from "@/features/expense/shared/db/cumulativeChart";

export type ContractTableRow = {
  id: number;
  name: string;
  supplier: string;
  category: string;
  frequency: string;
  amount: number;
  status: LifecycleStatus;
};

export type ContractTableSortBy = "name" | "supplier" | "amount" | "frequency";
export type ContractTableSortDir = "asc" | "desc";

export type ContractTableResponse = {
  rows: ContractTableRow[];
  nextOffset: number | null;
};

export type ContractChartGranularity = "1M" | "1Y";

export type ContractChartPoint = ChartPoint;

export type ContractChartData = Record<ContractChartGranularity, ContractChartPoint[]>;

export type ContractUpcomingRow = {
  id: number;
  label: string;
  amount: number;
  dueDate: string; // ISO
  frequency: string;
};
