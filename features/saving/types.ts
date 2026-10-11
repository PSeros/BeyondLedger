import type {LifecycleStatus} from "@/lib/status";
import type {ChartPoint} from "@/features/expense/shared/db/cumulativeChart";

// Saving is ONE model like Income; fixed = recurring savings plans, variable = one-off deposits and
// withdrawals (negative amount).
export type SavingTableRow = {
  id: number;
  name: string;
  target: string;
  amount: number;
  frequency: string;
  status: LifecycleStatus;
  date: string; // ISO startDate
};

export type SavingTableSortBy = "name" | "target" | "amount" | "frequency" | "date";
export type SavingTableSortDir = "asc" | "desc";

export type SavingTableResponse = {
  rows: SavingTableRow[];
  nextOffset: number | null;
};

export type SavingChartPoint = ChartPoint;

export type SavingVariableChartData = Record<"1W" | "1M" | "1Y", SavingChartPoint[]>;
export type SavingFixedChartData = Record<"1M" | "1Y", SavingChartPoint[]>;

// Paid in so far per target: deposits minus withdrawals up to today.
export type SavingTargetBalance = {
  id: number;
  name: string;
  paidIn: number;
};
