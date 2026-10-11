import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {parseInsightsQuery, type InsightsSeries} from "@/features/insights/params";
import {bucketTotals} from "@/features/insights/stats";
import {resolveWindow, spanFor} from "@/features/insights/window";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {
  isPeriodUnit,
  sortPeriodRows,
  sortTableRows,
  TABLE_SORT_KEYS,
  toPeriodRows,
  toTableRows,
  type TableRows,
  type TableSortKey,
} from "@/features/insights/table";

// All table rows for a request's query string (page filters + unit + sortBy / sortDir), shared by the
// paged rows route and the CSV export so both list exactly the same thing.
export async function loadTableRows(params: URLSearchParams): Promise<TableRows> {
  const query = parseInsightsQuery(params);
  const rawSortBy = params.get("sortBy");
  const sortBy: TableSortKey = (TABLE_SORT_KEYS as readonly string[]).includes(rawSortBy ?? "") ? (rawSortBy as TableSortKey) : "date";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

  const window = resolveWindow(query.window);
  const rows = await getInsightsRows(query, window, await getActiveWorkspaceId());
  const unit = query.unit;
  if (!isPeriodUnit(unit)) {
    return {mode: "entries", rows: sortTableRows(toTableRows(rows, unit), sortBy, sortDir)};
  }

  const span = spanFor(window, rows);
  const totalsOf = (domain: InsightsSeries) => bucketTotals(rows.filter((row) => row.domain === domain), unit, span);
  // Counting = summing a 1 per row over the same buckets.
  const counts = bucketTotals(rows.map((row) => ({...row, amount: 1})), unit, span);
  const totals = {expense: totalsOf("expense"), income: totalsOf("income"), saving: totalsOf("saving")};
  const periods = toPeriodRows(query.domain, totals, counts);
  return {mode: "periods", unit, rows: sortPeriodRows(periods, sortBy, sortDir)};
}
