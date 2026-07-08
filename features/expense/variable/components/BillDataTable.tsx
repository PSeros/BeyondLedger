"use client";

import type {SortDescriptor} from "@heroui/react";
import {Button} from "@heroui/react";
import {useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import type {BillTableResponse, BillTableRow, BillTableSortBy} from "@/features/expense/variable/types";

const LIMIT = 40;

const columns = [
  {id: "supplier", name: "Supplier", isRowHeader: true, allowsSorting: true},
  {id: "category", name: "Category", allowsSorting: false},
  {id: "totalAmount", name: "Total", allowsSorting: true},
  {id: "date", name: "Date", allowsSorting: true},
] as const;

function sortColumnToSortBy(column: string): BillTableSortBy {
  switch (column) {
    case "supplier":
      return "supplier";
    case "totalAmount":
      return "amount";
    case "date":
    default:
      return "date";
  }
}

function toTableRow(bill: BillTableRow) {
  return {
    id: bill.id,
    supplier: bill.supplier,
    category: bill.supplierCategory,
    totalAmount: bill.amount.toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
    }),
    date: new Date(bill.date).toLocaleString("de-DE", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    }),
  };
}

export default function BillDataTable() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "date",
    direction: "descending",
  });
  const [rows, setRows] = useState<BillTableRow[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sortBy = sortColumnToSortBy(String(sortDescriptor.column));
  const sortDir = sortDescriptor.direction === "descending" ? "desc" : "asc";

  const requestId = useRef(0);

  const fetchRows = useCallback(
    async (offset: number, mode: "replace" | "append") => {
      const currentRequestId = ++requestId.current;

      setIsLoading(true);

      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(LIMIT),
        sortBy,
        sortDir,
      });

      if (q) {
        params.set("q", q);
      }

      const response = await fetch(`/api/expense/variable/bills?${params.toString()}`);
      const data: BillTableResponse = await response.json();

      if (currentRequestId !== requestId.current) {
        return;
      }

      setRows((previous) => (mode === "append" ? [...previous, ...data.rows] : data.rows));
      setNextOffset(data.nextOffset);
      setIsLoading(false);
    },
    [q, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sortBy, sortDir]);

  const tableRows = rows.map(toTableRow);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataTable
          ariaLabel="Variable expenses"
          columns={columns}
          rows={tableRows}
          manualSorting
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        />
      </div>
      {nextOffset !== null && (
        <div className="flex shrink-0 justify-center">
          <Button
            isDisabled={isLoading}
            variant="tertiary"
            onPress={() => fetchRows(nextOffset, "append")}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
