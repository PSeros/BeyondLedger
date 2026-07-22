import type {Prisma} from "@/prisma/generated/client";

export type BillFilters = {
  q?: string;
  supplierId?: number;
  supplierCategoryId?: number;
  itemCategoryId?: number;
  // ISO calendar dates (yyyy-mm-dd), inclusive on both ends. Deliberately NOT applied to
  // the chart — see billChartData: a date range would starve its rolling-window baseline.
  dateFrom?: string;
  dateTo?: string;
};

export function buildBillWhere({
  q,
  supplierId,
  supplierCategoryId,
  itemCategoryId,
  dateFrom,
  dateTo,
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

  const dateClause: Prisma.DateTimeFilter = {};
  if (dateFrom) {
    dateClause.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    dateClause.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }
  if (dateClause.gte || dateClause.lte) {
    clauses.push({date: dateClause});
  }

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
