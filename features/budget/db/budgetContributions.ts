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
  billWhereSmart,
  contractWhereSmart,
  hasAnySelector,
  type FacetGroup,
} from "@/features/budget/db/budgetSmartMatch";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in its CURRENT period.
//
// MATCH MODEL (this branch): "smart selector" — item/contract categories are an ORed base; supplier
// category, supplier and tag are ANDed refiners on both domains. Mirrors computeActuals.

export type BudgetContributions = {
  bills: {id: number; date: string; supplierName: string; total: number}[];
  contracts: {id: number; name: string; supplierName: string; amount: number}[];
};

// Bills contributing when item categories ARE selected: a bill holding a qualifying line, AND-refined
// by supplier / supplier-category and (with the tag cascade) tag.
function billsForItemBase(g: FacetGroup, dateInWindow: object | undefined, workspaceId: number): object {
  const where: Record<string, unknown> = {workspaceId};
  if (dateInWindow) where.date = dateInWindow;
  if (g.supplierIds.length) where.supplierId = {in: g.supplierIds};
  if (g.supplierCategoryIds.length) where.supplier = {categoryId: {in: g.supplierCategoryIds}};
  where.items = {some: {categoryId: {in: g.itemCategoryIds}}};
  if (g.tagIds.length) {
    where.OR = [
      {tags: {some: {tagId: {in: g.tagIds}}}},
      {items: {some: {categoryId: {in: g.itemCategoryIds}, tags: {some: {tagId: {in: g.tagIds}}}}}},
    ];
  }
  return where;
}

export async function getBudgetContributions(budgetId: number): Promise<BudgetContributions> {
  const budget = await client.budget.findUnique({where: {id: budgetId}, include: {members: true}});
  if (!budget) return {bills: [], contracts: []};

  const g: FacetGroup = {
    itemCategoryIds: budget.members.filter((m) => m.itemCategoryId != null).map((m) => m.itemCategoryId as number),
    supplierCategoryIds: budget.members.filter((m) => m.supplierCategoryId != null).map((m) => m.supplierCategoryId as number),
    supplierIds: budget.members.filter((m) => m.supplierId != null).map((m) => m.supplierId as number),
    contractCategoryIds: budget.members.filter((m) => m.contractCategoryId != null).map((m) => m.contractCategoryId as number),
    tagIds: budget.members.filter((m) => m.tagId != null).map((m) => m.tagId as number),
  };

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

  const {variable, contract} = hasAnySelector(g) ? activeDomains(g) : {variable: false, contract: false};

  const billWhere = variable
    ? g.itemCategoryIds.length > 0
      ? billsForItemBase(g, dateInWindow, budget.workspaceId)
      : billWhereSmart(g, dateInWindow, budget.workspaceId)
    : null;

  const bills = billWhere
    ? await client.bill.findMany({
        where: billWhere,
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
