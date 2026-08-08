"use server";

import {client} from "@/lib/prisma";
import {
  computeContractContribution,
  resolveActivePeriod,
  windowMonthsFor,
  type BudgetPeriodType,
} from "@/features/budget/period";
import {
  activeDomains,
  contractWhereSmart,
  getSelectorTotals,
  hasAnySelector,
  normalizeAllSelected,
  type FacetGroup,
} from "@/features/budget/db/budgetSmartMatch";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in its CURRENT period.
//
// MATCH MODEL (this branch): "smart selector" — item/contract categories are an ORed base; supplier
// category, supplier and tag are ANDed refiners on both domains, with a fully-selected selector
// treated as unconstrained. A bill is listed when it holds a matching line (variable is item-level);
// a contract when it matches directly. Mirrors computeActuals.

export type BudgetContributions = {
  bills: {id: number; date: string; supplierName: string; total: number}[];
  contracts: {id: number; name: string; supplierName: string; amount: number}[];
};

// A `where` selecting bills that hold at least one contributing line (plus the bill-level refiners).
function billsWithMatchingItem(g: FacetGroup, dateInWindow: object | undefined, workspaceId: number): object {
  const where: Record<string, unknown> = {workspaceId};
  if (dateInWindow) where.date = dateInWindow;
  if (g.supplierIds.length) where.supplierId = {in: g.supplierIds};
  if (g.supplierCategoryIds.length) where.supplier = {categoryId: {in: g.supplierCategoryIds}};
  where.items = {
    some: {
      ...(g.itemCategoryIds.length ? {categoryId: {in: g.itemCategoryIds}} : {}),
      // Tag cascade: the line's own tag OR its bill's tag.
      ...(g.tagIds.length
        ? {OR: [{tags: {some: {tagId: {in: g.tagIds}}}}, {bill: {tags: {some: {tagId: {in: g.tagIds}}}}}]}
        : {}),
    },
  };
  return where;
}

export async function getBudgetContributions(budgetId: number): Promise<BudgetContributions> {
  const budget = await client.budget.findUnique({where: {id: budgetId}, include: {members: true}});
  if (!budget) return {bills: [], contracts: []};

  const raw: FacetGroup = {
    itemCategoryIds: budget.members.filter((m) => m.itemCategoryId != null).map((m) => m.itemCategoryId as number),
    supplierCategoryIds: budget.members.filter((m) => m.supplierCategoryId != null).map((m) => m.supplierCategoryId as number),
    supplierIds: budget.members.filter((m) => m.supplierId != null).map((m) => m.supplierId as number),
    contractCategoryIds: budget.members.filter((m) => m.contractCategoryId != null).map((m) => m.contractCategoryId as number),
    tagIds: budget.members.filter((m) => m.tagId != null).map((m) => m.tagId as number),
  };
  if (!hasAnySelector(raw)) return {bills: [], contracts: []};
  const totals = await getSelectorTotals();
  const g = normalizeAllSelected(raw, totals);

  const now = new Date();
  const {start, end} = resolveActivePeriod(
    {
      periodType: budget.periodType as BudgetPeriodType,
      anchorMonth: budget.anchorMonth,
      startDate: budget.startDate,
      endDate: budget.endDate,
    },
    now,
  );
  const windowMonths = windowMonthsFor(budget.periodType as BudgetPeriodType, start, end);
  const dateInWindow = start || end ? {...(start ? {gte: start} : {}), ...(end ? {lt: end} : {})} : undefined;
  const contractOverlap = {
    ...(end != null ? {startDate: {lt: end}} : {}),
    ...(start != null ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
  };

  const {variable, contract} = activeDomains(g);

  const bills = variable
    ? await client.bill.findMany({
        where: billsWithMatchingItem(g, dateInWindow, budget.workspaceId),
        select: {id: true, date: true, totalAmount: true, supplier: {select: {name: true}}},
        orderBy: {date: "desc"},
        take: 100,
      })
    : [];

  const contracts = contract
    ? await client.contract.findMany({
        where: contractWhereSmart(g, contractOverlap, budget.workspaceId),
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          frequency: {select: {value: true, isRecurring: true}},
          supplier: {select: {name: true}},
        },
        orderBy: {name: "asc"},
      })
    : [];

  return {
    bills: bills.map((bill) => ({id: bill.id, date: bill.date.toISOString(), supplierName: bill.supplier.name, total: Number(bill.totalAmount)})),
    contracts: contracts
      .map((contract) => ({
        id: contract.id,
        name: contract.name,
        supplierName: contract.supplier.name,
        amount: computeContractContribution(
          {
            startDate: contract.startDate,
            endDate: contract.endDate,
            totalAmount: Number(contract.totalAmount),
            frequencyValue: contract.frequency.value,
            isRecurring: contract.frequency.isRecurring,
          },
          {start, end},
          windowMonths,
          now,
        ),
      }))
      .filter((contract) => contract.amount > 0),
  };
}
