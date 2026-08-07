import {client} from "@/lib/prisma";
import {buildBillWhere, type BillFilters} from "@/features/expense/variable/db/billWhere";
import type {DonutSlice} from "@/features/dashboard/lib/donut";

// The FULL item-category spend breakdown (every category, no top-N cap), sorted by total desc, over
// the given filters. Unlike getTopItemCategories this returns the whole tail so a donut can show true
// proportions and fold the small ones into "Other" client-side (collapseSmall).
export async function getItemCategoryBreakdown(filters: BillFilters = {}): Promise<DonutSlice[]> {
  const grouped = await client.item.groupBy({
    by: ["categoryId"],
    where: {bill: buildBillWhere(filters)},
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
