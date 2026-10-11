import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {loadTableRows} from "@/features/insights/db/tableRows";
import type {InsightsTableResponse} from "@/features/insights/table";

// Paged, server-sorted Insights table rows. Takes the page's own query string (filters, window,
// domain, unit) plus sortBy / sortDir / offset / limit.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const rawLimit = Number(params.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const table = await loadTableRows(params);
  const page = {
    total: table.rows.length,
    nextOffset: offset + limit < table.rows.length ? offset + limit : null,
  };
  const response: InsightsTableResponse = table.mode === "entries"
    ? {mode: "entries", rows: table.rows.slice(offset, offset + limit), ...page}
    : {mode: "periods", unit: table.unit, rows: table.rows.slice(offset, offset + limit), ...page};
  return NextResponse.json(response);
}
