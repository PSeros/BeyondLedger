import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {loadTableRows} from "@/features/insights/db/tableRows";
import type {InsightsTableResponse} from "@/features/insights/table";

// Paged, server-sorted Insights entries. Takes the page's own query string (filters, window, domain)
// plus level / sortBy / sortDir / offset / limit.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawOffset = Number(params.get("offset"));
  const offset = Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  const rawLimit = Number(params.get("limit"));
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const sorted = await loadTableRows(params);
  const response: InsightsTableResponse = {
    rows: sorted.slice(offset, offset + limit),
    total: sorted.length,
    nextOffset: offset + limit < sorted.length ? offset + limit : null,
  };
  return NextResponse.json(response);
}
