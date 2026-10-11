"use client";

import type {SortDescriptor} from "@heroui/react";
import {Button, Card} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {LuChevronDown, LuDownload} from "react-icons/lu";
import DataTable from "@/components/DataTable";
import {addDays, isoWeek} from "@/features/expense/shared/db/cumulativeChart";
import {monthKey} from "@/features/budget/period";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import type {InsightsTableResponse, InsightsTableRow, PeriodRow, TableSortKey} from "@/features/insights/table";
import {INSIGHTS_SERIES, seriesOf, type InsightsSeries} from "@/features/insights/params";
import {SERIES_LABEL_KEYS} from "@/features/insights/colors";
import {dimensionKey} from "@/features/insights/labels";

const LIMIT = 40;
// URL keys that only shape the charts, so changing them must not refetch the table. The unit (?u)
// does: it decides whether the table lists entries or periods.
const DISPLAY_ONLY_KEYS = ["by"];

type Rows = {mode: "entries"; rows: InsightsTableRow[]} | {mode: "periods"; unit: "day" | "week" | "month"; rows: PeriodRow[]};

// The table follows the page-wide unit: single entries ("Position" / "Beleg / Zahlung") or one row
// per day / week / month. Paged and sorted on the server; collapsed by default and only fetched once
// opened. Clicking an entry opens it; clicking a period drills down into it.
export default function InsightsTable({activeWorkspaceId}: {activeWorkspaceId: number | null}) {
  const t = useTranslations("insights");
  const tFields = useTranslations("fields");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {query, update} = useInsightsParams();

  const filterString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of DISPLAY_ONLY_KEYS) params.delete(key);
    return params.toString();
  }, [searchParams]);

  const [isOpen, setIsOpen] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({column: "date", direction: "descending"});
  const [data, setData] = useState<Rows | null>(null);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const requestId = useRef(0);

  // Entries and periods have different columns, so a unit change starts from the date sort again.
  const unit = query.unit;
  useEffect(() => {
    setSortDescriptor({column: "date", direction: "descending"});
  }, [unit]);

  const sortBy = String(sortDescriptor.column) as TableSortKey;
  const sortDir = sortDescriptor.direction === "descending" ? "desc" : "asc";

  // Exactly the table's rows: same filters, unit and sort. A Content-Disposition attachment, so
  // assigning the URL downloads without leaving the page.
  function exportCsv() {
    const params = new URLSearchParams(filterString);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    window.location.assign(`/api/insights/export?${params.toString()}`);
  }

  const fetchRows = useCallback(async (offset: number, mode: "replace" | "append") => {
    const current = ++requestId.current;
    const params = new URLSearchParams(filterString);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("offset", String(offset));
    params.set("limit", String(LIMIT));

    const response = await fetch(`/api/insights/rows?${params.toString()}`);
    const data: InsightsTableResponse = await response.json();
    if (current !== requestId.current) return;

    setData((previous) => {
      const next: Rows = data.mode === "entries" ? {mode: "entries", rows: data.rows} : {mode: "periods", unit: data.unit, rows: data.rows};
      if (mode !== "append" || !previous || previous.mode !== next.mode) return next;
      return next.mode === "entries"
        ? {mode: "entries", rows: [...(previous.rows as InsightsTableRow[]), ...next.rows]}
        : {...next, rows: [...(previous.rows as PeriodRow[]), ...next.rows]};
    });
    setTotal(data.total);
    setNextOffset(data.nextOffset);
    if (mode === "append") {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [filterString, sortBy, sortDir]);

  useEffect(() => {
    if (isOpen) fetchRows(0, "replace");
  }, [isOpen, fetchRows, activeWorkspaceId]);

  const handleLoadMore = useCallback(() => {
    if (nextOffset === null || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    fetchRows(nextOffset, "append");
  }, [fetchRows, nextOffset]);

  const kindLabels: Record<InsightsTableRow["kind"], string> = {
    item: t("kind.item"),
    bill: t("kind.bill"),
    contractPayment: t("kind.contractPayment"),
    incomePayment: t("kind.incomePayment"),
    savingPayment: t("kind.savingPayment"),
  };
  const money = (value: number, isIncome = false) => (
    <span className={`tabular-nums ${isIncome ? "text-success" : ""}`}>{format.number(value, "currency")}</span>
  );
  const series = seriesOf(query.domain);
  const utc = (day: string) => new Date(`${day}T00:00:00Z`);

  function periodLabel(row: PeriodRow, periodUnit: "day" | "week" | "month"): string {
    const start = utc(row.date);
    if (periodUnit === "month") return format.dateTime(start, {month: "long", year: "numeric", timeZone: "UTC"});
    if (periodUnit === "day") return format.dateTime(start, {weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"});
    const range = format.dateTimeRange(start, addDays(start, 6), {day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC"});
    return `${t("weekLabel", {week: isoWeek(start)})} · ${range}`;
  }

  // Drill down: a month opens as days, a week as a range by day, a day as its single entries.
  function drillInto(row: PeriodRow, periodUnit: "day" | "week" | "month") {
    if (periodUnit === "month") {
      const at = row.date.slice(0, 7);
      update({p: null, m: null, from: null, to: null, at: at === monthKey(new Date()) ? null : at, u: "day"});
      return;
    }
    const to = periodUnit === "week" ? addDays(utc(row.date), 6).toISOString().slice(0, 10) : row.date;
    update({p: "RANGE", m: null, at: null, from: row.date, to, u: periodUnit === "week" ? "day" : null});
  }

  const entryColumns = [
    {id: "date", name: tFields("date"), allowsSorting: true},
    {id: "label", name: tFields("name"), isRowHeader: true, allowsSorting: true},
    {id: "counterparty", name: t(dimensionKey("counterparty", query.domain)), allowsSorting: true},
    {id: "category", name: tFields("category"), allowsSorting: true},
    {id: "kind", name: t("kindLabel"), allowsSorting: false},
    {id: "amount", name: tFields("total"), allowsSorting: true},
  ] as const;

  const periodColumns = [
    {id: "date", name: t("periodLabel"), isRowHeader: true, allowsSorting: true},
    {id: "count", name: t("csvEntries"), allowsSorting: true},
    ...series.map((key) => ({id: key, name: t(SERIES_LABEL_KEYS[key]), allowsSorting: series.length === 1})),
    ...(query.domain === "both" ? [{id: "amount", name: t("net"), allowsSorting: true}] : []),
  ];
  // Single-domain money columns sort by the row's `amount`, which is exactly that domain's total.
  const periodSortColumn = (column: string) => ((INSIGHTS_SERIES as readonly string[]).includes(column) ? "amount" : column);

  const entries = data?.mode === "entries" ? data.rows : [];
  const periods = data?.mode === "periods" ? data.rows : [];
  const periodUnit = data?.mode === "periods" ? data.unit : null;
  const hrefByKey = new Map(entries.map((row) => [row.key, row.href]));
  const periodByKey = new Map(periods.map((row) => [row.key, row]));

  const entryRows = entries.map((row) => ({
    id: row.key,
    date: format.dateTime(utc(row.date), {dateStyle: "medium", timeZone: "UTC"}),
    label: row.lineCount != null ? t("lineCount", {count: row.lineCount}) : row.label,
    counterparty: row.counterparty,
    category: <span className="block max-w-56 truncate" title={row.category}>{row.category}</span>,
    kind: <span className="text-muted">{kindLabels[row.kind]}</span>,
    amount: money(row.amount, row.domain === "income"),
  }));
  const periodRows = periods.map((row) => ({
    id: row.key,
    date: periodUnit ? periodLabel(row, periodUnit) : row.date,
    count: <span className={`tabular-nums ${row.count ? "" : "text-muted"}`}>{format.number(row.count)}</span>,
    expense: money(row.expense),
    income: money(row.income, true),
    saving: money(row.saving),
    amount: money(row.amount),
  }));

  const countLabel = data?.mode === "periods"
    ? t("periodCount", {count: total})
    : t("entryCount", {count: total});

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onPress={() => setIsOpen((open) => !open)} aria-expanded={isOpen} className="-ms-2">
          <LuChevronDown className={`size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}/>
          <Card.Title>{t("tableTitle")}</Card.Title>
          {isOpen && data ? <span className="text-sm font-normal text-muted">{countLabel}</span> : null}
        </Button>
        <Button size="sm" variant="tertiary" onPress={exportCsv}>
          <LuDownload/>
          {t("exportCsv")}
        </Button>
      </Card.Header>
      {isOpen && data ? (
        <Card.Content>
          {data.mode === "entries" ? (
            <DataTable
              ariaLabel={t("tableTitle")}
              columns={entryColumns}
              rows={entryRows}
              scroll="page"
              manualSorting
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
              hasMore={nextOffset !== null}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              onRowAction={(id) => {
                const href = hrefByKey.get(String(id));
                if (href) router.push(href);
              }}
            />
          ) : (
            <DataTable
              ariaLabel={t("tableTitle")}
              columns={periodColumns as {id: "date" | "count" | InsightsSeries | "amount"; name: string; isRowHeader?: boolean; allowsSorting?: boolean}[]}
              rows={periodRows}
              scroll="page"
              manualSorting
              sortDescriptor={{...sortDescriptor, column: sortDescriptor.column === "amount" && query.domain !== "both" ? query.domain : sortDescriptor.column}}
              onSortChange={(next) => setSortDescriptor({...next, column: periodSortColumn(String(next.column))})}
              hasMore={nextOffset !== null}
              isLoadingMore={isLoadingMore}
              onLoadMore={handleLoadMore}
              onRowAction={(id) => {
                const row = periodByKey.get(String(id));
                if (row && periodUnit) drillInto(row, periodUnit);
              }}
            />
          )}
        </Card.Content>
      ) : null}
    </Card>
  );
}
