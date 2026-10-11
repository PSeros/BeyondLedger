import type {InsightsRow, InsightsRowKind} from "@/features/insights/db/insightsRows";
import type {InsightsDomain, InsightsSeries, StatUnit} from "@/features/insights/params";

// Table rows for the Insights entry list, following the page-wide unit (?u): single entries for
// "item" / "bill", one row per day / week / month otherwise. Pure and client-safe.

export const TABLE_SORT_KEYS = ["date", "label", "counterparty", "category", "amount", "count"] as const;
export type TableSortKey = (typeof TABLE_SORT_KEYS)[number];

export type InsightsTableRow = {
  key: string;
  kind: InsightsRowKind | "bill";
  domain: InsightsSeries;
  date: string;
  label: string; // item / contract / income name; a bill's line count goes in `lineCount`
  lineCount: number | null;
  counterparty: string;
  category: string; // a bill with mixed categories joins them
  tags: string[];
  amount: number;
  href: string;
};

// One day / week / month. `date` is the period's first day; `amount` is what the shown domain sums
// to (net = income − expense − saving when all are shown), so it sorts like the entry amount column.
export type PeriodRow = {key: string; date: string; amount: number; count: number} & Record<InsightsSeries, number>;

export type InsightsTableResponse =
  | {mode: "entries"; rows: InsightsTableRow[]; total: number; nextOffset: number | null}
  | {mode: "periods"; unit: "day" | "week" | "month"; rows: PeriodRow[]; total: number; nextOffset: number | null};

export type TableRows =
  | {mode: "entries"; rows: InsightsTableRow[]}
  | {mode: "periods"; unit: "day" | "week" | "month"; rows: PeriodRow[]};

export const isPeriodUnit = (unit: StatUnit): unit is "day" | "week" | "month" =>
  unit === "day" || unit === "week" || unit === "month";

// "bill" folds a bill's matching lines into one row; payments stay as they are.
export function toTableRows(rows: InsightsRow[], level: "item" | "bill"): InsightsTableRow[] {
  const plain = (row: InsightsRow): InsightsTableRow => ({
    key: row.key,
    kind: row.kind,
    domain: row.domain,
    date: row.date,
    label: row.label,
    lineCount: null,
    counterparty: row.counterparty,
    category: row.category,
    tags: row.tags,
    amount: row.amount,
    href: row.href,
  });
  if (level === "item") return rows.map(plain);

  const bills = new Map<number, InsightsRow[]>();
  const out: InsightsTableRow[] = [];
  for (const row of rows) {
    if (row.billId == null) out.push(plain(row));
    else bills.set(row.billId, [...(bills.get(row.billId) ?? []), row]);
  }
  for (const [billId, lines] of bills) {
    out.push({
      key: `b${billId}`,
      kind: "bill",
      domain: "expense",
      date: lines[0].date,
      label: "",
      lineCount: lines.length,
      counterparty: lines[0].counterparty,
      category: [...new Set(lines.map((line) => line.category))].sort().join(", "),
      tags: [...new Set(lines.flatMap((line) => line.tags))].sort(),
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      href: lines[0].href,
    });
  }
  return out;
}

// Period rows from per-bucket totals and counts (bucket keys: yyyy-mm-dd for day/week, yyyy-mm for
// month). Empty periods are kept, so the rows match the KPI count and mean.
export function toPeriodRows(
  domain: InsightsDomain,
  totals: Record<InsightsSeries, Map<string, number>>,
  counts: Map<string, number>,
): PeriodRow[] {
  return [...counts.keys()].map((key) => {
    const expense = totals.expense.get(key) ?? 0;
    const income = totals.income.get(key) ?? 0;
    const saving = totals.saving.get(key) ?? 0;
    return {
      key,
      date: key.length === 7 ? `${key}-01` : key,
      expense,
      income,
      saving,
      amount: domain === "both" ? income - expense - saving : {expense, income, saving}[domain],
      count: counts.get(key) ?? 0,
    };
  });
}

const collator = new Intl.Collator(undefined, {sensitivity: "base", numeric: true});

export function sortTableRows(rows: InsightsTableRow[], by: TableSortKey, dir: "asc" | "desc"): InsightsTableRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const key = by === "count" ? "date" : by;
  return [...rows].sort((a, b) => {
    const primary = key === "amount" ? a.amount - b.amount : collator.compare(String(a[key]), String(b[key]));
    // Ties fall back to newest first, then key, so paging is stable.
    return sign * primary || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || collator.compare(a.key, b.key);
  });
}

export function sortPeriodRows(rows: PeriodRow[], by: TableSortKey, dir: "asc" | "desc"): PeriodRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const primary = by === "amount" ? a.amount - b.amount : by === "count" ? a.count - b.count : collator.compare(a.date, b.date);
    return sign * primary || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  });
}
