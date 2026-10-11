import {client} from "@/lib/prisma";
import type {Prisma} from "@/prisma/generated/client";
import {determineStatus} from "@/lib/status";
import {buildSavingWhere, type SavingFilters} from "@/features/saving/db/savingWhere";
import type {
  SavingTableResponse,
  SavingTableRow,
  SavingTableSortBy,
  SavingTableSortDir,
} from "@/features/saving/types";

type GetSavingTableRowsInput = SavingFilters & {
  offset?: number;
  limit?: number;
  sortBy?: SavingTableSortBy;
  sortDir?: SavingTableSortDir;
};

function getSavingOrderBy(
  sortBy: SavingTableSortBy,
  sortDir: SavingTableSortDir,
): Prisma.SavingOrderByWithRelationInput[] {
  switch (sortBy) {
    case "target":
      return [{target: {name: sortDir}}, {id: "asc"}];
    case "amount":
      return [{totalAmount: sortDir}, {id: "asc"}];
    case "frequency":
      return [{frequency: {value: sortDir}}, {id: "asc"}];
    case "date":
      return [{startDate: sortDir}, {id: "asc"}];
    case "name":
    default:
      return [{name: sortDir}, {id: "asc"}];
  }
}

export async function getSavingTableRows({
  offset = 0,
  limit = 40,
  sortBy = "name",
  sortDir = "asc",
  ...filters
}: GetSavingTableRowsInput): Promise<SavingTableResponse> {
  const savings = await client.saving.findMany({
    where: buildSavingWhere(filters),
    skip: offset,
    take: limit + 1,
    orderBy: getSavingOrderBy(sortBy, sortDir),
    include: {
      target: true,
      frequency: true,
    },
  });

  const rows: SavingTableRow[] = savings.slice(0, limit).map((saving) => ({
    id: saving.id,
    name: saving.name,
    target: saving.target.name,
    amount: Number(saving.totalAmount),
    frequency: saving.frequency.name,
    status: determineStatus({startDate: saving.startDate, endDate: saving.endDate}),
    date: saving.startDate.toISOString(),
  }));

  return {
    rows,
    nextOffset: savings.length > limit ? offset + limit : null,
  };
}

// Unfiltered count for a tab — drives the page-level empty state.
export async function getSavingCount(isRecurring: boolean): Promise<number> {
  return client.saving.count({where: {frequency: {isRecurring}}});
}
