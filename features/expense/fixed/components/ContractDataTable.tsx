"use client";

import type {SortDescriptor} from "@heroui/react";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import StatusChip from "@/components/StatusChip";
import type {ContractTableResponse, ContractTableRow, ContractTableSortBy} from "@/features/expense/fixed/types";

const LIMIT = 40;

const columns = [
  {id: "name", name: "Name", isRowHeader: true, allowsSorting: true},
  {id: "supplier", name: "Supplier", allowsSorting: true},
  {id: "category", name: "Category", allowsSorting: false},
  {id: "totalAmount", name: "Total", allowsSorting: true},
  {id: "frequency", name: "Frequency", allowsSorting: true},
  {id: "status", name: "Status", allowsSorting: false},
] as const;

function sortColumnToSortBy(column: string): ContractTableSortBy {
  switch (column) {
    case "supplier":
      return "supplier";
    case "totalAmount":
      return "amount";
    case "frequency":
      return "frequency";
    case "name":
    default:
      return "name";
  }
}

function toTableRow(contract: ContractTableRow) {
  return {
    id: contract.id,
    name: contract.name,
    supplier: contract.supplier,
    category: contract.category,
    totalAmount: contract.amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    }),
    frequency: contract.frequency,
    status: <StatusChip status={contract.status}/>,
  };
}

export default function ContractDataTable() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const supplierId = searchParams.get("supplierId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const frequencyId = searchParams.get("frequencyId") ?? "";
  const status = searchParams.get("status") ?? "";

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "name",
    direction: "ascending",
  });
  const [rows, setRows] = useState<ContractTableRow[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const sortBy = sortColumnToSortBy(String(sortDescriptor.column));
  const sortDir = sortDescriptor.direction === "descending" ? "desc" : "asc";

  const requestId = useRef(0);

  const fetchRows = useCallback(
    async (offset: number, mode: "replace" | "append") => {
      const currentRequestId = ++requestId.current;

      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(LIMIT),
        sortBy,
        sortDir,
      });

      if (q) {
        params.set("q", q);
      }
      if (supplierId) {
        params.set("supplierId", supplierId);
      }
      if (categoryId) {
        params.set("categoryId", categoryId);
      }
      if (frequencyId) {
        params.set("frequencyId", frequencyId);
      }
      if (status) {
        params.set("status", status);
      }

      const response = await fetch(`/api/expense/fixed/contracts?${params.toString()}`);
      const data: ContractTableResponse = await response.json();

      if (currentRequestId !== requestId.current) {
        return;
      }

      setRows((previous) => (mode === "append" ? [...previous, ...data.rows] : data.rows));
      setNextOffset(data.nextOffset);

      if (mode === "append") {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    },
    [q, supplierId, categoryId, frequencyId, status, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, supplierId, categoryId, frequencyId, status, sortBy, sortDir]);

  const handleLoadMore = useCallback(() => {
    if (nextOffset === null || isLoadingMoreRef.current) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    fetchRows(nextOffset, "append");
  }, [fetchRows, nextOffset]);

  const tableRows = rows.map(toTableRow);

  return (
    <DataTable
      ariaLabel="Fixed expenses"
      columns={columns}
      rows={tableRows}
      manualSorting
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      hasMore={nextOffset !== null}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      onRowAction={(id) => router.push(`/expense/fixed/${String(id)}`)}
    />
  );
}
