"use client";

import type {SortDescriptor} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import StatusChip from "@/components/StatusChip";
import type {IncomeTableResponse, IncomeTableRow, IncomeTableSortBy} from "@/features/income/types";

const LIMIT = 40;

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

type IncomeDataTableProps = {
  isRecurring: boolean;
  activeWorkspaceId: number | null;
};

export default function IncomeDataTable({isRecurring, activeWorkspaceId}: IncomeDataTableProps) {
  const router = useRouter();
  const t = useTranslations();
  const format = useFormatter();
  const searchParams = useSearchParams();
  // Global (persisted) account filter — passed as a prop so a switch re-runs the fetch effect below.
  const workspace = activeWorkspaceId != null ? String(activeWorkspaceId) : "";

  // Fixed (recurring) income shows Frequency + lifecycle Status; variable (one-time) income shows
  // the occurrence Date instead — same one row type, different visible columns.
  const fixedColumns = [
    {id: "name", name: t("fields.name"), isRowHeader: true, allowsSorting: true},
    {id: "source", name: t("fields.source"), allowsSorting: true},
    {id: "category", name: t("fields.category"), allowsSorting: false},
    {id: "totalAmount", name: t("fields.total"), allowsSorting: true},
    {id: "frequency", name: t("fields.frequency"), allowsSorting: true},
    {id: "status", name: t("fields.status"), allowsSorting: false},
  ] as const;

  const variableColumns = [
    {id: "name", name: t("fields.name"), isRowHeader: true, allowsSorting: true},
    {id: "source", name: t("fields.source"), allowsSorting: true},
    {id: "category", name: t("fields.category"), allowsSorting: false},
    {id: "totalAmount", name: t("fields.total"), allowsSorting: true},
    {id: "date", name: t("fields.date"), allowsSorting: true},
  ] as const;

  function toTableRow(income: IncomeTableRow) {
    return {
      id: income.id,
      name: income.name,
      source: income.source,
      category: income.category,
      totalAmount: format.number(income.amount, "currency"),
      frequency: income.frequency,
      status: <StatusChip status={income.status}/>,
      date: format.dateTime(new Date(income.date), "long"),
    };
  }

  const q = searchParams.get("q") ?? "";
  const sourceId = searchParams.get("sourceId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const frequencyId = searchParams.get("frequencyId") ?? "";
  const tags = searchParams.get("tags") ?? "";
  const status = searchParams.get("status") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

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
      if (sourceId) {
        params.set("sourceId", sourceId);
      }
      if (categoryId) {
        params.set("categoryId", categoryId);
      }
      if (frequencyId) {
        params.set("frequencyId", frequencyId);
      }
      if (tags) {
        params.set("tags", tags);
      }
      if (workspace) {
        params.set("workspace", workspace);
      }
      if (status) {
        params.set("status", status);
      }
      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.set("dateTo", dateTo);
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
    [q, sourceId, categoryId, frequencyId, tags, workspace, status, dateFrom, dateTo, isRecurring, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sourceId, categoryId, frequencyId, tags, workspace, status, dateFrom, dateTo, isRecurring, sortBy, sortDir]);

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
      ariaLabel={isRecurring ? t("tables.fixedIncome") : t("tables.variableIncome")}
      columns={isRecurring ? fixedColumns : variableColumns}
      rows={tableRows}
      manualSorting
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      hasMore={nextOffset !== null}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      onRowAction={(id) => router.push(`/income/${isRecurring ? "fixed" : "variable"}/${String(id)}`)}
    />
  );
}
