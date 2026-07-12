import type {Prisma} from "@/prisma/generated/client";

export function buildBillWhere(q?: string): Prisma.BillWhereInput {
  const search = q?.trim();

  if (!search) {
    return {};
  }

  return {
    OR: [
      {supplier: {name: {contains: search}}},
      {supplier: {category: {name: {contains: search}}}},
      {documentNumber: {contains: search}},
      {items: {some: {name: {contains: search}}}},
      {items: {some: {category: {name: {contains: search}}}}},
    ],
  };
}
