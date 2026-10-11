import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {parseInsightsQuery} from "@/features/insights/params";
import {resolveWindow} from "@/features/insights/window";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {
  sortTableRows,
  TABLE_LEVELS,
  TABLE_SORT_KEYS,
  toTableRows,
  type InsightsTableRow,
  type TableLevel,
  type TableSortKey,
} from "@/features/insights/table";

// All matching table rows for a request's query string (page filters + level / sortBy / sortDir),
// shared by the paged rows route and the CSV export so both list exactly the same entries.
export async function loadTableRows(params: URLSearchParams): Promise<InsightsTableRow[]> {
  const query = parseInsightsQuery(params);
  const rawLevel = params.get("level");
  const level: TableLevel = (TABLE_LEVELS as readonly string[]).includes(rawLevel ?? "") ? (rawLevel as TableLevel) : "bill";
  const rawSortBy = params.get("sortBy");
  const sortBy: TableSortKey = (TABLE_SORT_KEYS as readonly string[]).includes(rawSortBy ?? "") ? (rawSortBy as TableSortKey) : "date";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";

  const rows = await getInsightsRows(query, resolveWindow(query.window), await getActiveWorkspaceId());
  return sortTableRows(toTableRows(rows, level), sortBy, sortDir);
}
