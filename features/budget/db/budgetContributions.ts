"use server";

import {client} from "@/lib/prisma";
import {resolveActivePeriod, type BudgetPeriodType} from "@/features/budget/period";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in its CURRENT period. Bills are matched via any
// of the budget's bill-level selectors (supplier / supplier-category) or item-level selectors
// (an item in a selected category); contracts via their category, monthly-ized and pro-rated to
// the window. Fetched lazily so the page load doesn't pull every contributing row for every budget.

export type BudgetContributions = {
  bills: {id: number; date: string; supplierName: string; total: number}[];
  contracts: {id: number; name: string; supplierName: string; amount: number}[];
};

export async function getBudgetContributions(budgetId: number): Promise<BudgetContributions> {
  const budget = await client.budget.findUnique({where: {id: budgetId}, include: {members: true}});
  if (!budget) return {bills: [], contracts: []};

  const itemCategoryIds = budget.members.filter((m) => m.itemCategoryId != null).map((m) => m.itemCategoryId as number);
  const supplierCategoryIds = budget.members.filter((m) => m.supplierCategoryId != null).map((m) => m.supplierCategoryId as number);
  const supplierIds = budget.members.filter((m) => m.supplierId != null).map((m) => m.supplierId as number);
  const contractCategoryIds = budget.members.filter((m) => m.contractCategoryId != null).map((m) => m.contractCategoryId as number);

  const {start, end} = resolveActivePeriod({
    periodType: budget.periodType as BudgetPeriodType,
    anchorMonth: budget.anchorMonth,
    startDate: budget.startDate,
    endDate: budget.endDate,
  });
  const months = start && end ? Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth())) : 1;
  const dateInWindow = start || end ? {...(start ? {gte: start} : {}), ...(end ? {lt: end} : {})} : undefined;

  const billOr: object[] = [];
  if (supplierIds.length) billOr.push({supplierId: {in: supplierIds}});
  if (supplierCategoryIds.length) billOr.push({supplier: {categoryId: {in: supplierCategoryIds}}});
  if (itemCategoryIds.length) billOr.push({items: {some: {categoryId: {in: itemCategoryIds}}}});

  // A budget belongs to one account (Phase 14), so only that account's bills/contracts contribute.
  const bills = billOr.length
    ? await client.bill.findMany({
        where: {workspaceId: budget.workspaceId, ...(dateInWindow ? {date: dateInWindow} : {}), OR: billOr},
        select: {id: true, date: true, totalAmount: true, supplier: {select: {name: true}}},
        orderBy: {date: "desc"},
        take: 100,
      })
    : [];

  const contracts = contractCategoryIds.length
    ? await client.contract.findMany({
        where: {
          categoryId: {in: contractCategoryIds},
          workspaceId: budget.workspaceId,
          ...(end ? {startDate: {lt: end}} : {}),
          ...(start ? {OR: [{endDate: null}, {endDate: {gte: start}}]} : {}),
        },
        select: {id: true, name: true, totalAmount: true, frequency: {select: {value: true}}, supplier: {select: {name: true}}},
        orderBy: {name: "asc"},
      })
    : [];

  return {
    bills: bills.map((bill) => ({id: bill.id, date: bill.date.toISOString(), supplierName: bill.supplier.name, total: Number(bill.totalAmount)})),
    contracts: contracts.map((contract) => ({
      id: contract.id,
      name: contract.name,
      supplierName: contract.supplier.name,
      amount: (Number(contract.totalAmount) * contract.frequency.value) / 12 * months,
    })),
  };
}
