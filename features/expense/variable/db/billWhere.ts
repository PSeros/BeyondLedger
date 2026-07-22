import type {Prisma} from "@/prisma/generated/client";

export type BillFilters = {
  q?: string;
  supplierId?: number;
  supplierCategoryId?: number;
  itemCategoryId?: number;
};

export function buildBillWhere({
  q,
  supplierId,
  supplierCategoryId,
  itemCategoryId,
}: BillFilters = {}): Prisma.BillWhereInput {
  const clauses: Prisma.BillWhereInput[] = [];

  const search = q?.trim();
  if (search) {
    clauses.push({
      OR: [
        {supplier: {name: {contains: search}}},
        {supplier: {category: {name: {contains: search}}}},
        {documentNumber: {contains: search}},
        {items: {some: {name: {contains: search}}}},
        {items: {some: {category: {name: {contains: search}}}}},
      ],
    });
  }

  if (supplierId != null) {
    clauses.push({supplierId});
  }

  if (supplierCategoryId != null) {
    clauses.push({supplier: {categoryId: supplierCategoryId}});
  }

  if (itemCategoryId != null) {
    clauses.push({items: {some: {categoryId: itemCategoryId}}});
  }

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
