import type {Prisma} from "@/prisma/generated/client";
import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
import type {DateWindow} from "@/features/expense/shared/db/cumulativeChart";
import type {DonutSlice} from "@/features/dashboard/lib/donut";

// The FULL item-category spend breakdown (every category, no top-N cap), sorted by total desc, over
// the given filters. Unlike getTopItemCategories this returns the whole tail so a donut can show true
// proportions and fold the small ones into "Other" client-side (collapseSmall). An optional `window`
// scopes to bills dated within [start, end) — the dashboard donut follows the selected period.
export async function getItemCategoryBreakdown(
  filters: BillFilters = {},
  window?: DateWindow,
): Promise<DonutSlice[]> {
  const billWhere: Prisma.BillWhereInput = window
    ? {AND: [buildBillWhere(filters), {date: {gte: window.start, lt: window.end}}]}
    : buildBillWhere(filters);

  const grouped = await client.item.groupBy({
    by: ["categoryId"],
    where: {bill: billWhere},
    _sum: {totalPrice: true},
    _count: {_all: true},
    orderBy: {_sum: {totalPrice: "desc"}},
  });

  const categories = await client.itemCategory.findMany({
    where: {id: {in: grouped.map((group) => group.categoryId)}},
    select: {id: true, name: true},
  });
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return grouped.map((group) => ({
    id: group.categoryId,
    label: nameById.get(group.categoryId) ?? "—",
    amount: Number(group._sum.totalPrice ?? 0),
    count: group._count._all,
  }));
}
