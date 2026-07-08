"use client";

import {useMemo} from "react";
import DataTable from "@/components/DataTable";
import StatusChip from "@/components/StatusChip";
import {useContractFilterStore} from "@/features/expense/fixed/store/contractFilterStore";
import type {LifecycleStatus} from "@/lib/status";

type ContractDataTableItem = {
  id: number;
  name: string;
  supplier: string;
  category: string;
  totalAmount: number;
  frequency: string;
  status: LifecycleStatus;
};

type ContractDataTableProps = {
  contracts: ContractDataTableItem[];
};

function includesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search);
}

export default function ContractDataTable({contracts}: ContractDataTableProps) {
  const search = useContractFilterStore((state) => state.search);
  const category = useContractFilterStore((state) => state.category);
  const frequency = useContractFilterStore((state) => state.frequency);
  const status = useContractFilterStore((state) => state.status);

  const filteredContracts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matchesSearch =
        !q ||
        includesSearch(contract.name, q) ||
        includesSearch(contract.supplier, q) ||
        includesSearch(contract.category, q) ||
        includesSearch(contract.totalAmount.toString(), q) ||
        includesSearch(contract.frequency, q) ||
        includesSearch(contract.status, q)

      const matchesCategory =
        !category || contract.category === category;

      const matchesFrequency =
        !frequency || contract.frequency === frequency;

      const matchesStatus =
        !status || contract.status === status;

      return matchesSearch && matchesCategory && matchesFrequency && matchesStatus;
    });
  }, [contracts, search, category, frequency, status]);

  const rows = filteredContracts.map((contract) => ({
    id: contract.id,
    name: contract.name,
    supplier: contract.supplier,
    category: contract.category,
    totalAmount: contract.totalAmount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    }),
    frequency: contract.frequency,
    status: <StatusChip status={contract.status}/>,
  }));

  const columns = [
    {id: "name", name: "Name", isRowHeader: true},
    {id: "supplier", name: "Supplier"},
    {id: "category", name: "Category"},
    {id: "totalAmount", name: "Total"},
    {id: "frequency", name: "Frequency"},
    {id: "status", name: "Status"},
  ] as const;

  return (
    <DataTable
      ariaLabel="Fixed expenses"
      columns={columns}
      rows={rows}
    />
  );
}
