import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getContractTableRows} from "@/features/expense/fixed/db/contractTableData";
import type {ContractTableSortBy, ContractTableSortDir} from "@/features/expense/fixed/types";

const SORT_BY_VALUES: readonly ContractTableSortBy[] = ["name", "supplier", "amount", "frequency"];
const SORT_DIR_VALUES: readonly ContractTableSortDir[] = ["asc", "desc"];

function parsePositiveId(value: string | null): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const q = params.get("q") ?? "";

  const rawSortBy = params.get("sortBy");
  const sortBy: ContractTableSortBy = SORT_BY_VALUES.includes(rawSortBy as ContractTableSortBy)
    ? (rawSortBy as ContractTableSortBy)
    : "name";

  const rawSortDir = params.get("sortDir");
  const sortDir: ContractTableSortDir = SORT_DIR_VALUES.includes(rawSortDir as ContractTableSortDir)
    ? (rawSortDir as ContractTableSortDir)
    : "asc";

  const rawOffset = Number(params.get("offset"));
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

  const rawLimit = Number(params.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 40;

  const supplierId = parsePositiveId(params.get("supplierId"));
  const categoryId = parsePositiveId(params.get("categoryId"));
  const frequencyId = parsePositiveId(params.get("frequencyId"));

  const result = await getContractTableRows({
    q,
    offset,
    limit,
    sortBy,
    sortDir,
    supplierId,
    categoryId,
    frequencyId,
  });

  return NextResponse.json(result);
}
