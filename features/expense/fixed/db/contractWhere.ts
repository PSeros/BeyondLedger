import type {Prisma} from "@/prisma/generated/client";

export function buildContractWhere(q?: string): Prisma.ContractWhereInput {
  const search = q?.trim();

  if (!search) {
    return {};
  }

  return {
    OR: [
      {name: {contains: search}},
      {supplier: {name: {contains: search}}},
      {category: {name: {contains: search}}},
      {documentNumber: {contains: search}},
    ],
  };
}
