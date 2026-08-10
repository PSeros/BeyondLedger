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
  billsWithMatchingItem,
  contractWhereSmart,
  facetSelectionFromMembers,
  getSelectorTotals,
  hasAnySelector,
  normalizeAllSelected,
  windowFilters,
  type FacetSelection,
} from "@/features/budget/db/budgetSmartMatch";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in its CURRENT period.
//
// MATCH MODEL: "smart selector" — included item/contract categories are an ORed base; included
// supplier category, supplier and tag are ANDed refiners on both domains; excluded values are a
// global AND-NOT; a fully-included selector is treated as unconstrained. A bill is listed when it
// holds a matching line (variable is item-level); a contract when it matches directly. Shares its
// `where` builders with computeActuals so the list can't drift from the number.

export type BudgetContributions = {
  bills: {id: number; date: string; supplierName: string; total: number}[];
  contracts: {id: number; name: string; supplierName: string; amount: number}[];
};

export async function getBudgetContributions(budgetId: number): Promise<BudgetContributions> {
  const budget = await client.budget.findUnique({where: {id: budgetId}, include: {members: true}});
  if (!budget) return {bills: [], contracts: []};

  const raw: FacetSelection = facetSelectionFromMembers(budget.members);
  if (!hasAnySelector(raw)) return {bills: [], contracts: []};
  const totals = await getSelectorTotals();
  const sel = normalizeAllSelected(raw, totals);

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
  const {dateInWindow, contractOverlap} = windowFilters(start, end);

  const {variable, contract} = activeDomains(sel);

  const bills = variable
    ? await client.bill.findMany({
        where: billsWithMatchingItem(sel, dateInWindow, budget.workspaceId),
        select: {id: true, date: true, totalAmount: true, supplier: {select: {name: true}}},
        orderBy: {date: "desc"},
        take: 100,
      })
    : [];

  const contracts = contract
    ? await client.contract.findMany({
        where: contractWhereSmart(sel, contractOverlap, budget.workspaceId),
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
