import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getSavingTableRows} from "@/features/saving/db/savingTableData";
import type {SavingTableSortBy, SavingTableSortDir} from "@/features/saving/types";
import type {LifecycleStatus} from "@/lib/status";

const SORT_BY_VALUES: readonly SavingTableSortBy[] = ["name", "target", "amount", "frequency", "date"];
const SORT_DIR_VALUES: readonly SavingTableSortDir[] = ["asc", "desc"];
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
  const sortBy: SavingTableSortBy = SORT_BY_VALUES.includes(rawSortBy as SavingTableSortBy)
    ? (rawSortBy as SavingTableSortBy)
    : "name";

  const rawSortDir = params.get("sortDir");
  const sortDir: SavingTableSortDir = SORT_DIR_VALUES.includes(rawSortDir as SavingTableSortDir)
    ? (rawSortDir as SavingTableSortDir)
    : "asc";

  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const rawLimit = Number(params.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const rawIsRecurring = params.get("isRecurring");
  const isRecurring = rawIsRecurring === "true" ? true : rawIsRecurring === "false" ? false : undefined;

  const targetId = parsePositiveId(params.get("targetId"));
  const frequencyId = parsePositiveId(params.get("frequencyId"));
  const workspaceId = parsePositiveId(params.get("workspace"));
  const tagIds = parseIds(params.get("tags"));
  const status = parseStatus(params.get("status"));
  const dateFrom = parseIsoDate(params.get("dateFrom"));
  const dateTo = parseIsoDate(params.get("dateTo"));

  const result = await getSavingTableRows({
    q,
    offset,
    limit,
    sortBy,
    sortDir,
    isRecurring,
    targetId,
    frequencyId,
    workspaceId,
    tagIds,
    status,
    dateFrom,
    dateTo,
  });

  return NextResponse.json(result);
}
