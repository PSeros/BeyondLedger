import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getBillTableRows} from "@/features/expense/variable/db/billTableData";
import type {BillTableSortBy, BillTableSortDir} from "@/features/expense/variable/types";

const SORT_BY_VALUES: readonly BillTableSortBy[] = ["date", "supplier", "amount"];
const SORT_DIR_VALUES: readonly BillTableSortDir[] = ["asc", "desc"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const q = params.get("q") ?? "";

  const rawSortBy = params.get("sortBy");
  const sortBy: BillTableSortBy = SORT_BY_VALUES.includes(rawSortBy as BillTableSortBy)
    ? (rawSortBy as BillTableSortBy)
    : "date";

  const rawSortDir = params.get("sortDir");
  const sortDir: BillTableSortDir = SORT_DIR_VALUES.includes(rawSortDir as BillTableSortDir)
    ? (rawSortDir as BillTableSortDir)
    : "desc";

  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const rawLimit = Number(params.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const result = await getBillTableRows({q, offset, limit, sortBy, sortDir});

  return NextResponse.json(result);
}
