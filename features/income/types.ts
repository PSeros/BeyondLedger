import type {LifecycleStatus} from "@/lib/status";

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
