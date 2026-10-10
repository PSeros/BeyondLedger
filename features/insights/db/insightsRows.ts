import {client} from "@/lib/prisma";
import {
  activeDomains,
  contractWhereSmart,
  getSelectorTotals,
  normalizeAllSelected,
  variableItemWhere,
  windowFilters,
  type FacetSelection,
} from "@/features/budget/db/budgetSmartMatch";
import {forEachOccurrence} from "@/features/expense/shared/db/recurrence";
import {dateKey} from "@/features/expense/shared/db/cumulativeChart";
import type {InsightsQuery, SignedIds} from "@/features/insights/params";
import {realizedBounds, type ResolvedWindow} from "@/features/insights/window";

// The normalized rows every Insights view (stats, charts, table, export) is built from. Expenses use
// the budget matcher, so a filter set matches exactly what a budget with the same selectors would.
// Contracts and income are expanded into their actual payments inside the window (no amortizing):
// a yearly contract shows up once in a year and only in the month it is paid. Nothing past today.

export type InsightsRowKind = "item" | "contractPayment" | "incomePayment";

export type InsightsRow = {
  key: string;
  kind: InsightsRowKind;
  domain: "expense" | "income";
  sourceId: number; // item / contract / income id
  billId: number | null;
  date: string; // yyyy-mm-dd
  label: string;
  counterparty: string; // supplier or income source
  category: string;
  tags: string[]; // a bill's tags cascade onto its lines
  amount: number;
  href: string; // detail page
};

const TAGS = {select: {tag: {select: {name: true}}}} as const;
const tagNames = (...lists: {tag: {name: string}}[][]): string[] => [...new Set(lists.flat().map((entry) => entry.tag.name))];

function signedWhere(field: string, ids: SignedIds): object[] {
  return [
    ...(ids.include.length ? [{[field]: {in: ids.include}}] : []),
    ...(ids.exclude.length ? [{NOT: {[field]: {in: ids.exclude}}}] : []),
  ];
}

// An include selector holding every value is unconstrained, as in budgets.
function dropAll(ids: SignedIds, total: number): SignedIds {
  return total > 0 && ids.include.length >= total ? {include: [], exclude: ids.exclude} : ids;
}

async function expenseRows(sel: FacetSelection, window: ResolvedWindow, workspaceId: number | null): Promise<InsightsRow[]> {
  const {dateInWindow, contractOverlap} = windowFilters(window.start, window.end);
  const {variable, contract} = activeDomains(sel);

  const [items, contracts] = await Promise.all([
    variable
      ? client.item.findMany({
        where: variableItemWhere(sel, dateInWindow, workspaceId),
        select: {
          id: true,
          name: true,
          totalPrice: true,
          category: {select: {name: true}},
          tags: TAGS,
          bill: {select: {id: true, date: true, supplier: {select: {name: true}}, tags: TAGS}},
        },
      })
      : [],
    contract
      ? client.contract.findMany({
        where: contractWhereSmart(sel, contractOverlap, workspaceId),
        select: {
          id: true,
          name: true,
          totalAmount: true,
          startDate: true,
          endDate: true,
          frequency: {select: {value: true, isRecurring: true}},
          category: {select: {name: true}},
          supplier: {select: {name: true}},
          tags: TAGS,
        },
      })
      : [],
  ]);

  const rows: InsightsRow[] = items.map((item) => ({
    key: `i${item.id}`,
    kind: "item",
    domain: "expense",
    sourceId: item.id,
    billId: item.bill.id,
    date: dateKey(item.bill.date),
    label: item.name,
    counterparty: item.bill.supplier.name,
    category: item.category.name,
    tags: tagNames(item.tags, item.bill.tags),
    amount: Number(item.totalPrice),
    href: `/expense/variable/${item.bill.id}`,
  }));

  const paid = realizedBounds(window);
  for (const c of contracts) {
    forEachOccurrence(c, paid.start, paid.end, (date) => {
      const day = dateKey(date);
      rows.push({
        key: `c${c.id}-${day}`,
        kind: "contractPayment",
        domain: "expense",
        sourceId: c.id,
        billId: null,
        date: day,
        label: c.name,
        counterparty: c.supplier.name,
        category: c.category.name,
        tags: tagNames(c.tags),
        amount: Number(c.totalAmount),
        href: `/expense/fixed/${c.id}`,
      });
    });
  }
  return rows;
}

async function incomeRows(query: InsightsQuery, tags: SignedIds, window: ResolvedWindow, workspaceId: number | null): Promise<InsightsRow[]> {
  const [categoryTotal, sourceTotal] = await Promise.all([client.incomeCategory.count(), client.incomeSource.count()]);
  const categoryIds = dropAll(query.income.categoryIds, categoryTotal);
  const sourceIds = dropAll(query.income.sourceIds, sourceTotal);
  const {contractOverlap} = windowFilters(window.start, window.end);

  const incomes = await client.income.findMany({
    where: {
      ...(workspaceId != null ? {workspaceId} : {}),
      ...contractOverlap,
      AND: [
        ...signedWhere("categoryId", categoryIds),
        ...signedWhere("sourceId", sourceIds),
        ...(tags.include.length ? [{tags: {some: {tagId: {in: tags.include}}}}] : []),
        ...(tags.exclude.length ? [{NOT: {tags: {some: {tagId: {in: tags.exclude}}}}}] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      totalAmount: true,
      startDate: true,
      endDate: true,
      frequency: {select: {value: true, isRecurring: true}},
      category: {select: {name: true}},
      source: {select: {name: true}},
      tags: TAGS,
    },
  });

  const rows: InsightsRow[] = [];
  const paid = realizedBounds(window);
  for (const income of incomes) {
    forEachOccurrence(income, paid.start, paid.end, (date) => {
      const day = dateKey(date);
      rows.push({
        key: `n${income.id}-${day}`,
        kind: "incomePayment",
        domain: "income",
        sourceId: income.id,
        billId: null,
        date: day,
        label: income.name,
        counterparty: income.source.name,
        category: income.category.name,
        tags: tagNames(income.tags),
        amount: Number(income.totalAmount),
        href: `/income/${income.frequency.isRecurring ? "fixed" : "variable"}/${income.id}`,
      });
    });
  }
  return rows;
}

export async function getInsightsRows(query: InsightsQuery, window: ResolvedWindow, workspaceId: number | null): Promise<InsightsRow[]> {
  const sel = normalizeAllSelected(query.expense, await getSelectorTotals());
  const tags = {include: sel.include.tagIds, exclude: sel.exclude.tagIds};

  const [expense, income] = await Promise.all([
    query.domain !== "income" ? expenseRows(sel, window, workspaceId) : [],
    query.domain !== "expense" ? incomeRows(query, tags, window, workspaceId) : [],
  ]);
  return [...expense, ...income].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
