"use client";

import type {SortDescriptor} from "@heroui/react";
import {useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import StatusChip from "@/components/StatusChip";
import type {IncomeTableResponse, IncomeTableRow, IncomeTableSortBy} from "@/features/income/types";

const LIMIT = 40;

// Fixed (recurring) income shows Frequency + lifecycle Status; variable (one-time) income shows the
// occurrence Date (startDate) instead — same one row type, different visible columns.
const fixedColumns = [
  {id: "name", name: "Name", isRowHeader: true, allowsSorting: true},
  {id: "source", name: "Source", allowsSorting: true},
  {id: "category", name: "Category", allowsSorting: false},
  {id: "totalAmount", name: "Total", allowsSorting: true},
  {id: "frequency", name: "Frequency", allowsSorting: true},
  {id: "status", name: "Status", allowsSorting: false},
] as const;

const variableColumns = [
  {id: "name", name: "Name", isRowHeader: true, allowsSorting: true},
  {id: "source", name: "Source", allowsSorting: true},
  {id: "category", name: "Category", allowsSorting: false},
  {id: "totalAmount", name: "Total", allowsSorting: true},
  {id: "date", name: "Date", allowsSorting: true},
] as const;

function sortColumnToSortBy(column: string): IncomeTableSortBy {
  switch (column) {
    case "source":
      return "source";
    case "totalAmount":
      return "amount";
    case "frequency":
      return "frequency";
    case "date":
      return "date";
    case "name":
    default:
      return "name";
  }
}

function toTableRow(income: IncomeTableRow) {
  return {
    id: income.id,
    name: income.name,
    source: income.source,
    category: income.category,
    totalAmount: income.amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    }),
    frequency: income.frequency,
    status: <StatusChip status={income.status}/>,
    date: new Date(income.date).toLocaleString("de-DE", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }),
  };
}

type IncomeDataTableProps = {
  isRecurring: boolean;
};

export default function IncomeDataTable({isRecurring}: IncomeDataTableProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>(
    isRecurring
      ? {column: "name", direction: "ascending"}
      : {column: "date", direction: "descending"},
  );
  const [rows, setRows] = useState<IncomeTableRow[]>([]);
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
        isRecurring: String(isRecurring),
      });

      if (q) {
        params.set("q", q);
      }

      const response = await fetch(`/api/income?${params.toString()}`);
      const data: IncomeTableResponse = await response.json();

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
    [q, isRecurring, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isRecurring, sortBy, sortDir]);

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
      ariaLabel={isRecurring ? "Fixed income" : "Variable income"}
      columns={isRecurring ? fixedColumns : variableColumns}
      rows={tableRows}
      manualSorting
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      hasMore={nextOffset !== null}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
    />
  );
}
