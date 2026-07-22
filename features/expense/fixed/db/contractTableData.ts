import {client} from "@/lib/prisma";
import type {Prisma} from "@/prisma/generated/client";
import {determineStatus} from "@/lib/status";
import {buildContractWhere, type ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import type {
  ContractTableResponse,
  ContractTableRow,
  ContractTableSortBy,
  ContractTableSortDir,
} from "@/features/expense/fixed/types";

type GetContractTableRowsInput = ContractFilters & {
  offset?: number;
  limit?: number;
  sortBy?: ContractTableSortBy;
  sortDir?: ContractTableSortDir;
};

function getContractOrderBy(
  sortBy: ContractTableSortBy,
  sortDir: ContractTableSortDir,
): Prisma.ContractOrderByWithRelationInput[] {
  switch (sortBy) {
    case "supplier":
      return [{supplier: {name: sortDir}}, {id: "asc"}];
    case "amount":
      return [{totalAmount: sortDir}, {id: "asc"}];
    case "frequency":
      return [{frequency: {value: sortDir}}, {id: "asc"}];
    case "name":
    default:
      return [{name: sortDir}, {id: "asc"}];
  }
}

export async function getContractTableRows({
  offset = 0,
  limit = 40,
  sortBy = "name",
  sortDir = "asc",
  ...filters
}: GetContractTableRowsInput): Promise<ContractTableResponse> {
  const contracts = await client.contract.findMany({
    where: buildContractWhere(filters),
    skip: offset,
    take: limit + 1,
    orderBy: getContractOrderBy(sortBy, sortDir),
    include: {
      supplier: true,
      category: true,
      frequency: true,
    },
  });

  const rows: ContractTableRow[] = contracts.slice(0, limit).map((contract) => ({
    id: contract.id,
    name: contract.name,
    supplier: contract.supplier.name,
    category: contract.category.name,
    frequency: contract.frequency.name,
    amount: Number(contract.totalAmount),
    status: determineStatus({
      startDate: contract.startDate,
      endDate: contract.endDate,
    }),
  }));

  return {
    rows,
    nextOffset: contracts.length > limit ? offset + limit : null,
  };
}
