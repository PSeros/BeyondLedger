"use server";

import {client} from "@/lib/prisma";
import {
  computeContractContribution,
  resolveActivePeriod,
  windowMonthsFor,
  type BudgetPeriodType,
} from "@/features/budget/period";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in its CURRENT period. Bills are matched via any
// of the budget's bill-level selectors (supplier / supplier-category), item-level selectors (an
// item in a selected category), or tags (on the bill or an item); contracts via their category or a
// tag, each contributing the same per-window amount the card sums (computeContractContribution).
// Fetched lazily so the page load doesn't pull every contributing row for every budget.

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
  const tagIds = budget.members.filter((m) => m.tagId != null).map((m) => m.tagId as number);

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

  const billOr: object[] = [];
  if (supplierIds.length) billOr.push({supplierId: {in: supplierIds}});
  if (supplierCategoryIds.length) billOr.push({supplier: {categoryId: {in: supplierCategoryIds}}});
  if (itemCategoryIds.length) billOr.push({items: {some: {categoryId: {in: itemCategoryIds}}}});
  // Tag members surface a bill when the bill itself is tagged or any of its items is tagged.
  if (tagIds.length) {
    billOr.push({tags: {some: {tagId: {in: tagIds}}}});
    billOr.push({items: {some: {tags: {some: {tagId: {in: tagIds}}}}}});
  }

  // A budget belongs to one account (Phase 14), so only that account's bills/contracts contribute.
  const bills = billOr.length
    ? await client.bill.findMany({
        where: {workspaceId: budget.workspaceId, ...(dateInWindow ? {date: dateInWindow} : {}), OR: billOr},
        select: {id: true, date: true, totalAmount: true, supplier: {select: {name: true}}},
        orderBy: {date: "desc"},
        take: 100,
      })
    : [];

  // Contracts count via their category or a tag on the contract; window-overlap + workspace apply
  // to both. AND-wrap the selector OR so it can't collide with the window-overlap OR above.
  const contractSelectorOr: object[] = [];
  if (contractCategoryIds.length) contractSelectorOr.push({categoryId: {in: contractCategoryIds}});
  if (tagIds.length) contractSelectorOr.push({tags: {some: {tagId: {in: tagIds}}}});

  const contracts = contractSelectorOr.length
    ? await client.contract.findMany({
        where: {
          workspaceId: budget.workspaceId,
          AND: [
            {OR: contractSelectorOr},
            ...(end ? [{startDate: {lt: end}}] : []),
            ...(start ? [{OR: [{endDate: null}, {endDate: {gte: start}}]}] : []),
          ],
        },
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
      // A queried contract overlaps the window but can still resolve to 0 (e.g. its active span
      // leaves no trigger in a bounded window) — don't list a €0 contributor.
      .filter((contract) => contract.amount > 0),
  };
}
