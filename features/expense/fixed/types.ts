import type {LifecycleStatus} from "@/lib/status";

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
