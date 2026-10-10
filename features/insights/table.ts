import type {InsightsRow, InsightsRowKind} from "@/features/insights/db/insightsRows";

// Table rows for the Insights entry list. Pure and client-safe (types only from the db module).

export const TABLE_LEVELS = ["item", "bill"] as const;
export type TableLevel = (typeof TABLE_LEVELS)[number];

export const TABLE_SORT_KEYS = ["date", "label", "counterparty", "category", "amount"] as const;
export type TableSortKey = (typeof TABLE_SORT_KEYS)[number];

export type InsightsTableRow = {
  key: string;
  kind: InsightsRowKind | "bill";
  domain: "expense" | "income";
  date: string;
  label: string; // item / contract / income name; a bill's line count goes in `lineCount`
  lineCount: number | null;
  counterparty: string;
  category: string; // a bill with mixed categories joins them
  amount: number;
  href: string;
};

export type InsightsTableResponse = {rows: InsightsTableRow[]; total: number; nextOffset: number | null};

// "bill" folds a bill's matching lines into one row; payments stay as they are.
export function toTableRows(rows: InsightsRow[], level: TableLevel): InsightsTableRow[] {
  const plain = (row: InsightsRow): InsightsTableRow => ({
    key: row.key,
    kind: row.kind,
    domain: row.domain,
    date: row.date,
    label: row.label,
    lineCount: null,
    counterparty: row.counterparty,
    category: row.category,
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
      amount: lines.reduce((sum, line) => sum + line.amount, 0),
      href: lines[0].href,
    });
  }
  return out;
}

export function sortTableRows(rows: InsightsTableRow[], by: TableSortKey, dir: "asc" | "desc"): InsightsTableRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const collator = new Intl.Collator(undefined, {sensitivity: "base", numeric: true});
  return [...rows].sort((a, b) => {
    const primary = by === "amount" ? a.amount - b.amount : collator.compare(String(a[by]), String(b[by]));
    // Ties fall back to newest first, then key, so paging is stable.
    return sign * primary || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) || collator.compare(a.key, b.key);
  });
}
