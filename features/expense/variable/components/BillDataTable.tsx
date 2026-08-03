"use client";

import type {SortDescriptor} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import DataTable from "@/components/DataTable";
import type {BillTableResponse, BillTableRow, BillTableSortBy} from "@/features/expense/variable/types";

const LIMIT = 40;

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

export default function BillDataTable() {
  const router = useRouter();
  const t = useTranslations();
  const format = useFormatter();
  const searchParams = useSearchParams();

  const columns = [
    {id: "supplier", name: t("fields.supplier"), isRowHeader: true, allowsSorting: true},
    {id: "category", name: t("fields.category"), allowsSorting: false},
    {id: "totalAmount", name: t("fields.total"), allowsSorting: true},
    {id: "date", name: t("fields.date"), allowsSorting: true},
  ] as const;

  function toTableRow(bill: BillTableRow) {
    return {
      id: bill.id,
      supplier: bill.supplier,
      category: bill.supplierCategory,
      totalAmount: format.number(bill.amount, "currency"),
      date: format.dateTime(new Date(bill.date), "long"),
    };
  }
  const q = searchParams.get("q") ?? "";
  const supplierId = searchParams.get("supplierId") ?? "";
  const supplierCategoryId = searchParams.get("supplierCategoryId") ?? "";
  const itemCategoryId = searchParams.get("itemCategoryId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "date",
    direction: "descending",
  });
  const [rows, setRows] = useState<BillTableRow[]>([]);
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
      if (supplierCategoryId) {
        params.set("supplierCategoryId", supplierCategoryId);
      }
      if (itemCategoryId) {
        params.set("itemCategoryId", itemCategoryId);
      }
      if (dateFrom) {
        params.set("dateFrom", dateFrom);
      }
      if (dateTo) {
        params.set("dateTo", dateTo);
      }

      const response = await fetch(`/api/expense/variable/bills?${params.toString()}`);
      const data: BillTableResponse = await response.json();

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
    [q, supplierId, supplierCategoryId, itemCategoryId, dateFrom, dateTo, sortBy, sortDir],
  );

  useEffect(() => {
    fetchRows(0, "replace");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, supplierId, supplierCategoryId, itemCategoryId, dateFrom, dateTo, sortBy, sortDir]);

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
      ariaLabel={t("tables.variableExpenses")}
      columns={columns}
      rows={tableRows}
      manualSorting
      sortDescriptor={sortDescriptor}
      onSortChange={setSortDescriptor}
      hasMore={nextOffset !== null}
      isLoadingMore={isLoadingMore}
      onLoadMore={handleLoadMore}
      onRowAction={(id) => router.push(`/expense/variable/${String(id)}`)}
    />
  );
}
