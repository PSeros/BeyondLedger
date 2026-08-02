import {client} from "@/lib/prisma";
import type {Prisma} from "@/prisma/generated/client";
import {determineStatus} from "@/lib/status";
import {buildIncomeWhere, type IncomeFilters} from "@/features/income/db/incomeWhere";
import type {
  IncomeTableResponse,
  IncomeTableRow,
  IncomeTableSortBy,
  IncomeTableSortDir,
} from "@/features/income/types";

type GetIncomeTableRowsInput = IncomeFilters & {
  offset?: number;
  limit?: number;
  sortBy?: IncomeTableSortBy;
  sortDir?: IncomeTableSortDir;
};

function getIncomeOrderBy(
  sortBy: IncomeTableSortBy,
  sortDir: IncomeTableSortDir,
): Prisma.IncomeOrderByWithRelationInput[] {
  switch (sortBy) {
    case "source":
      return [{source: {name: sortDir}}, {id: "asc"}];
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

export async function getIncomeTableRows({
  offset = 0,
  limit = 40,
  sortBy = "name",
  sortDir = "asc",
  ...filters
}: GetIncomeTableRowsInput): Promise<IncomeTableResponse> {
  const incomes = await client.income.findMany({
    where: buildIncomeWhere(filters),
    skip: offset,
    take: limit + 1,
    orderBy: getIncomeOrderBy(sortBy, sortDir),
    include: {
      source: true,
      category: true,
      frequency: true,
    },
  });

  const rows: IncomeTableRow[] = incomes.slice(0, limit).map((income) => ({
    id: income.id,
    name: income.name,
    source: income.source.name,
    category: income.category.name,
    amount: Number(income.totalAmount),
    frequency: income.frequency.name,
    status: determineStatus({startDate: income.startDate, endDate: income.endDate}),
    date: income.startDate.toISOString(),
  }));

  return {
    rows,
    nextOffset: incomes.length > limit ? offset + limit : null,
  };
}
