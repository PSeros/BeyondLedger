import type {Prisma} from "@/prisma/generated/client";

export type ContractFilters = {
  q?: string;
  supplierId?: number;
  categoryId?: number;
  frequencyId?: number;
};

export function buildContractWhere({
  q,
  supplierId,
  categoryId,
  frequencyId,
}: ContractFilters = {}): Prisma.ContractWhereInput {
  const clauses: Prisma.ContractWhereInput[] = [];

  const search = q?.trim();
  if (search) {
    clauses.push({
      OR: [
        {name: {contains: search}},
        {supplier: {name: {contains: search}}},
        {category: {name: {contains: search}}},
        {documentNumber: {contains: search}},
      ],
    });
  }

  if (supplierId != null) {
    clauses.push({supplierId});
  }

  if (categoryId != null) {
    clauses.push({categoryId});
  }

  if (frequencyId != null) {
    clauses.push({frequencyId});
  }

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
