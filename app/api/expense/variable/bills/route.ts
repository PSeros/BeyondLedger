import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getBillTableRows} from "@/features/expense/variable/db/billTableData";
import type {BillTableSortBy, BillTableSortDir} from "@/features/expense/variable/types";

const SORT_BY_VALUES: readonly BillTableSortBy[] = ["date", "supplier", "amount"];
const SORT_DIR_VALUES: readonly BillTableSortDir[] = ["asc", "desc"];

function parsePositiveId(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIsoDate(value: string | null): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseIds(value: string | null): number[] | undefined {
  const ids = (value ?? "")
    .split(",")
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

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

  const supplierId = parsePositiveId(params.get("supplierId"));
  const supplierCategoryId = parsePositiveId(params.get("supplierCategoryId"));
  const itemCategoryId = parsePositiveId(params.get("itemCategoryId"));
  const tagIds = parseIds(params.get("tags"));
  const dateFrom = parseIsoDate(params.get("dateFrom"));
  const dateTo = parseIsoDate(params.get("dateTo"));

  const result = await getBillTableRows({
    q,
    offset,
    limit,
    sortBy,
    sortDir,
    supplierId,
    supplierCategoryId,
    itemCategoryId,
    tagIds,
    dateFrom,
    dateTo,
  });

  return NextResponse.json(result);
}
