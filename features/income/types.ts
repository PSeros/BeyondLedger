import type {LifecycleStatus} from "@/lib/status";
import type {ChartPoint} from "@/features/expense/shared/db/cumulativeChart";

// Income is ONE model; the fixed/variable tabs are a Frequency.isRecurring split over it. A single
// row type carries every column both tabs need — fixed renders Frequency/Status, variable renders
// the Date (startDate) — and each table picks the columns it shows.
export type IncomeTableRow = {
  id: number;
  name: string;
  source: string;
  category: string;
  amount: number;
  frequency: string;
  status: LifecycleStatus;
  date: string; // ISO startDate
};

export type IncomeTableSortBy = "name" | "source" | "amount" | "frequency" | "date";
export type IncomeTableSortDir = "asc" | "desc";

export type IncomeTableResponse = {
  rows: IncomeTableRow[];
  nextOffset: number | null;
};

export type IncomeChartPoint = ChartPoint;

// Variable (one-time) income has real occurrence dates → a weekday view is meaningful (1W/1M/1Y).
// Fixed (recurring) income is projected from startDate/frequency → 1M/1Y only, like Contract.
export type IncomeVariableChartData = Record<"1W" | "1M" | "1Y", IncomeChartPoint[]>;
export type IncomeFixedChartData = Record<"1M" | "1Y", IncomeChartPoint[]>;

export type IncomeTopKRow = {
  id: number;
  label: string;
  amount: number;
  count: number;
};

export type IncomeUpcomingRow = {
  id: number;
  label: string;
  amount: number;
  dueDate: string; // ISO
  frequency: string;
};
