import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getIncomeTableRows} from "@/features/income/db/incomeTableData";
import type {IncomeTableSortBy, IncomeTableSortDir} from "@/features/income/types";

const SORT_BY_VALUES: readonly IncomeTableSortBy[] = ["name", "source", "amount", "frequency", "date"];
const SORT_DIR_VALUES: readonly IncomeTableSortDir[] = ["asc", "desc"];

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

  const result = await getIncomeTableRows({q, offset, limit, sortBy, sortDir, isRecurring});

  return NextResponse.json(result);
}
