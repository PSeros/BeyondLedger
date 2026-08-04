import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getIncomeTableRows} from "@/features/income/db/incomeTableData";
import type {IncomeTableSortBy, IncomeTableSortDir} from "@/features/income/types";
import type {LifecycleStatus} from "@/lib/status";

const SORT_BY_VALUES: readonly IncomeTableSortBy[] = ["name", "source", "amount", "frequency", "date"];
const SORT_DIR_VALUES: readonly IncomeTableSortDir[] = ["asc", "desc"];
const STATUS_VALUES: readonly LifecycleStatus[] = ["Active", "Pending", "Inactive"];

function parsePositiveId(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseStatus(value: string | null): LifecycleStatus | undefined {
  return STATUS_VALUES.includes(value as LifecycleStatus) ? (value as LifecycleStatus) : undefined;
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
  const sortBy: IncomeTableSortBy = SORT_BY_VALUES.includes(rawSortBy as IncomeTableSortBy)
    ? (rawSortBy as IncomeTableSortBy)
    : "name";

  const rawSortDir = params.get("sortDir");
  const sortDir: IncomeTableSortDir = SORT_DIR_VALUES.includes(rawSortDir as IncomeTableSortDir)
    ? (rawSortDir as IncomeTableSortDir)
    : "asc";

  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const rawLimit = Number(params.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const rawIsRecurring = params.get("isRecurring");
  const isRecurring = rawIsRecurring === "true" ? true : rawIsRecurring === "false" ? false : undefined;

  const sourceId = parsePositiveId(params.get("sourceId"));
  const categoryId = parsePositiveId(params.get("categoryId"));
  const frequencyId = parsePositiveId(params.get("frequencyId"));
  const tagIds = parseIds(params.get("tags"));
  const status = parseStatus(params.get("status"));
  const dateFrom = parseIsoDate(params.get("dateFrom"));
  const dateTo = parseIsoDate(params.get("dateTo"));

  const result = await getIncomeTableRows({
    q,
    offset,
    limit,
    sortBy,
    sortDir,
    isRecurring,
    sourceId,
    categoryId,
    frequencyId,
    tagIds,
    status,
    dateFrom,
    dateTo,
  });

  return NextResponse.json(result);
}
