"use client";

import type {SortDescriptor} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import StatusChip from "@/components/StatusChip";
import type {SavingTableResponse, SavingTableRow, SavingTableSortBy} from "@/features/saving/types";

const LIMIT = 40;

function sortColumnToSortBy(column: string): SavingTableSortBy {
  switch (column) {
    case "target":
      return "target";
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

type SavingDataTableProps = {
  isRecurring: boolean;
  activeWorkspaceId: number | null;
};

export default function SavingDataTable({isRecurring, activeWorkspaceId}: SavingDataTableProps) {
  const router = useRouter();
  const t = useTranslations();
  const format = useFormatter();
  const searchParams = useSearchParams();
  // Global (persisted) account filter — passed as a prop so a switch re-runs the fetch effect below.
  const workspace = activeWorkspaceId != null ? String(activeWorkspaceId) : "";

  // Fixed = plans (Frequency + Status); variable = one-offs (Date).
  const fixedColumns = [
    {id: "name", name: t("fields.name"), isRowHeader: true, allowsSorting: true},
    {id: "target", name: t("fields.target"), allowsSorting: true},
    {id: "totalAmount", name: t("fields.total"), allowsSorting: true},
    {id: "frequency", name: t("fields.frequency"), allowsSorting: true},
    {id: "status", name: t("fields.status"), allowsSorting: false},
  ] as const;

  const variableColumns = [
    {id: "name", name: t("fields.name"), isRowHeader: true, allowsSorting: true},
    {id: "target", name: t("fields.target"), allowsSorting: true},
    {id: "totalAmount", name: t("fields.total"), allowsSorting: true},
    {id: "date", name: t("fields.date"), allowsSorting: true},
  ] as const;

  function toTableRow(saving: SavingTableRow) {
    return {
      id: saving.id,
      name: saving.name,
      target: saving.target,
      totalAmount: format.number(saving.amount, "currency"),
      frequency: saving.frequency,
      status: <StatusChip status={saving.status}/>,
      date: format.dateTime(new Date(saving.date), "long"),
    };
  }

  const q = searchParams.get("q") ?? "";
  const targetId = searchParams.get("targetId") ?? "";
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
  const [rows, setRows] = useState<SavingTableRow[]>([]);
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
      if (targetId) {
        params.set("targetId", targetId);
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

      const response = await fetch(`/api/saving?${params.toString()}`);
      const data: SavingTableResponse = await response.json();

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
    [q, targetId, frequencyId, tags, workspace, status, dateFrom, dateTo, isRecurring, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, targetId, frequencyId, tags, workspace, status, dateFrom, dateTo, isRecurring, sortBy, sortDir]);

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
      ariaLabel={isRecurring ? t("tables.fixedSaving") : t("tables.variableSaving")}
      columns={isRecurring ? fixedColumns : variableColumns}
      rows={tableRows}
      scroll="page"
      manualSorting
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      hasMore={nextOffset !== null}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      onRowAction={(id) => router.push(`/saving/${isRecurring ? "fixed" : "variable"}/${String(id)}`)}
    />
  );
}
