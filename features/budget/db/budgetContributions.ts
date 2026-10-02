"use server";

import {client} from "@/lib/prisma";
import {
  computeContractContribution,
  parseMonthAnchor,
  resolveActivePeriod,
  windowMonthsFor,
  type BudgetPeriodType,
} from "@/features/budget/period";
import {
  activeDomains,
  contractWhereSmart,
  facetSelectionFromMembers,
  getSelectorTotals,
  hasAnySelector,
  normalizeAllSelected,
  windowFilters,
  variableItemWhere,
  type FacetSelection,
} from "@/features/budget/db/budgetSmartMatch";

// On-demand read (a server action, called when a budget's "View entries" modal opens) listing the
// bills and contracts that contribute to a budget in the period containing `anchor` (the page's
// `?at=YYYY-MM`; absent = the current month) — resolved exactly like the card's actual.
//
// MATCH MODEL: "smart selector" — included item/contract categories are an ORed base; included
// supplier category, supplier and tag are ANDed refiners on both domains; excluded values are a
// global AND-NOT; a fully-included selector is treated as unconstrained. A bill is listed when it
// holds a matching line (variable is item-level); a contract when it matches directly. Shares its
// `where` builders with computeActuals so the list can't drift from the number.
//
// Granularity follows what matched: a bill is listed whole when the match is bill-level (supplier,
// supplier category, tag on the bill) and every line counts; otherwise its matching items are
// listed individually (item category, tag on the item, or only some lines count).

export type BudgetContributions = {
  bills: {id: number; date: string; supplierName: string; total: number}[];
  items: {id: number; billId: number; name: string; date: string; supplierName: string; total: number}[];
  contracts: {id: number; name: string; supplierName: string; amount: number}[];
};

export async function getBudgetContributions(budgetId: number, anchor?: string): Promise<BudgetContributions> {
  const budget = await client.budget.findUnique({where: {id: budgetId}, include: {members: true}});
  if (!budget) return {bills: [], items: [], contracts: []};

  const raw: FacetSelection = facetSelectionFromMembers(budget.members);
  if (!hasAnySelector(raw)) return {bills: [], items: [], contracts: []};
  const totals = await getSelectorTotals();
  const sel = normalizeAllSelected(raw, totals);

  const now = parseMonthAnchor(anchor);
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

  const matchedItems = variable
    ? await client.item.findMany({
        where: variableItemWhere(sel, dateInWindow, budget.workspaceId),
        select: {
          id: true,
          name: true,
          totalPrice: true,
          bill: {
            select: {
              id: true,
              date: true,
              supplier: {select: {name: true}},
              _count: {select: {items: true}},
              tags: {where: {tagId: {in: sel.include.tagIds}}, select: {tagId: true}},
            },
          },
        },
        orderBy: [{bill: {date: "desc"}}, {billId: "desc"}, {id: "asc"}],
        take: 500,
      })
    : [];

  const byBill = new Map<number, typeof matchedItems>();
  for (const item of matchedItems) {
    const group = byBill.get(item.bill.id);
    if (group) group.push(item);
    else byBill.set(item.bill.id, [item]);
  }

  const bills: BudgetContributions["bills"] = [];
  const items: BudgetContributions["items"] = [];
  for (const group of byBill.values()) {
    const bill = group[0].bill;
    const lineLevel = sel.include.itemCategoryIds.length > 0 || (sel.include.tagIds.length > 0 && bill.tags.length === 0);
    const date = bill.date.toISOString();
    const supplierName = bill.supplier.name;
    if (!lineLevel && group.length === bill._count.items) {
      bills.push({id: bill.id, date, supplierName, total: group.reduce((sum, item) => sum + Number(item.totalPrice), 0)});
    } else {
      for (const item of group) {
        items.push({id: item.id, billId: bill.id, name: item.name, date, supplierName, total: Number(item.totalPrice)});
      }
    }
  }

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
    bills,
    items,
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
