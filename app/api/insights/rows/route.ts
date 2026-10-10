import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getInsightsRows} from "@/features/insights/db/insightsRows";
import {parseInsightsQuery} from "@/features/insights/params";
import {resolveWindow} from "@/features/insights/window";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {
  sortTableRows,
  TABLE_LEVELS,
  TABLE_SORT_KEYS,
  toTableRows,
  type InsightsTableResponse,
  type TableLevel,
  type TableSortKey,
} from "@/features/insights/table";

// Paged, server-sorted Insights entries. Takes the page's own query string (filters, window, domain)
// plus level / sortBy / sortDir / offset / limit.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = parseInsightsQuery(params);

  const rawLevel = params.get("level");
  const level: TableLevel = (TABLE_LEVELS as readonly string[]).includes(rawLevel ?? "") ? (rawLevel as TableLevel) : "bill";
  const rawSortBy = params.get("sortBy");
  const sortBy: TableSortKey = (TABLE_SORT_KEYS as readonly string[]).includes(rawSortBy ?? "") ? (rawSortBy as TableSortKey) : "date";
  const sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const rawLimit = Number(params.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const rows = await getInsightsRows(query, resolveWindow(query.window), await getActiveWorkspaceId());
  const sorted = sortTableRows(toTableRows(rows, level), sortBy, sortDir);
  const page = sorted.slice(offset, offset + limit);

  const response: InsightsTableResponse = {
    rows: page,
    total: sorted.length,
    nextOffset: offset + limit < sorted.length ? offset + limit : null,
  };
  return NextResponse.json(response);
}
