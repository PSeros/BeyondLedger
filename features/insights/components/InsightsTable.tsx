"use client";

import type {SortDescriptor} from "@heroui/react";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter, useSearchParams} from "next/navigation";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {LuChevronDown} from "react-icons/lu";
import DataTable from "@/components/DataTable";
import {
  TABLE_LEVELS,
  type InsightsTableResponse,
  type InsightsTableRow,
  type TableLevel,
  type TableSortKey,
} from "@/features/insights/table";

const LIMIT = 40;
// URL keys that only shape the stats/charts, so changing them must not refetch the table.
const DISPLAY_ONLY_KEYS = ["u", "st", "by"];

// The matching entries, paged and sorted on the server. Collapsed by default and only fetched once
// opened. Level and sort are table-only state.
export default function InsightsTable({activeWorkspaceId}: {activeWorkspaceId: number | null}) {
  const t = useTranslations("insights");
  const tFields = useTranslations("fields");
  const format = useFormatter();
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterString = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of DISPLAY_ONLY_KEYS) params.delete(key);
    return params.toString();
  }, [searchParams]);

  const [isOpen, setIsOpen] = useState(false);
  const [level, setLevel] = useState<TableLevel>("bill");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({column: "date", direction: "descending"});
  const [rows, setRows] = useState<InsightsTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const requestId = useRef(0);

  const sortBy = String(sortDescriptor.column) as TableSortKey;
  const sortDir = sortDescriptor.direction === "descending" ? "desc" : "asc";

  const fetchRows = useCallback(async (offset: number, mode: "replace" | "append") => {
    const current = ++requestId.current;
    const params = new URLSearchParams(filterString);
    params.set("level", level);
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);
    params.set("offset", String(offset));
    params.set("limit", String(LIMIT));

    const response = await fetch(`/api/insights/rows?${params.toString()}`);
    const data: InsightsTableResponse = await response.json();
    if (current !== requestId.current) return;

    setRows((previous) => (mode === "append" ? [...previous, ...data.rows] : data.rows));
    setTotal(data.total);
    setNextOffset(data.nextOffset);
    if (mode === "append") {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [filterString, level, sortBy, sortDir]);

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
  };

  const columns = [
    {id: "date", name: tFields("date"), allowsSorting: true},
    {id: "label", name: tFields("name"), isRowHeader: true, allowsSorting: true},
    {id: "counterparty", name: t("byCounterparty"), allowsSorting: true},
    {id: "category", name: tFields("category"), allowsSorting: true},
    {id: "kind", name: t("kindLabel"), allowsSorting: false},
    {id: "amount", name: tFields("total"), allowsSorting: true},
  ] as const;

  const hrefByKey = new Map(rows.map((row) => [row.key, row.href]));
  const tableRows = rows.map((row) => ({
    id: row.key,
    date: format.dateTime(new Date(`${row.date}T00:00:00Z`), {dateStyle: "medium", timeZone: "UTC"}),
    label: row.lineCount != null ? t("lineCount", {count: row.lineCount}) : row.label,
    counterparty: row.counterparty,
    category: <span className="block max-w-56 truncate" title={row.category}>{row.category}</span>,
    kind: <span className="text-muted">{kindLabels[row.kind]}</span>,
    amount: (
      <span className={`tabular-nums ${row.domain === "income" ? "text-success" : ""}`}>
        {format.number(row.amount, "currency")}
      </span>
    ),
  }));

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onPress={() => setIsOpen((open) => !open)} aria-expanded={isOpen} className="-ms-2">
          <LuChevronDown className={`size-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}/>
          <Card.Title>{t("tableTitle")}</Card.Title>
          {isOpen ? <span className="text-sm font-normal text-muted">{t("entryCount", {count: total})}</span> : null}
        </Button>
        {isOpen ? (
          <ButtonGroup size="sm">
            {TABLE_LEVELS.map((value) => (
              <Button key={value} variant={level === value ? "secondary" : "tertiary"} onPress={() => setLevel(value)}>
                {t(`level.${value}`)}
              </Button>
            ))}
          </ButtonGroup>
        ) : null}
      </Card.Header>
      {isOpen ? (
        <Card.Content>
          <DataTable
            ariaLabel={t("tableTitle")}
            columns={columns}
            rows={tableRows}
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
        </Card.Content>
      ) : null}
    </Card>
  );
}
