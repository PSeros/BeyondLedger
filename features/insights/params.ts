// Type-only: budgetSmartMatch imports Prisma, and this module is also loaded on the client.
import type {FacetGroup, FacetSelection} from "@/features/budget/db/budgetSmartMatch";
import {BUDGET_PERIOD_TYPES, monthKey, parseMonthAnchor, type BudgetPeriodType} from "@/features/budget/period";

// The Insights page state, all of it in the URL (shared by the page, the table/export API routes and,
// later, saved views). Neutral module: no "use client", so Server Components get real values.
//
// Signed id lists: `?ic=3,-7` includes item category 3 and excludes 7 — the budget tri-state, flat.

export const INSIGHTS_DOMAINS = ["expense", "income", "both"] as const;
export type InsightsDomain = (typeof INSIGHTS_DOMAINS)[number];

// The time window mirrors budget periods: a period type (?p) resolved against a month anchor (?at,
// stepped by the navigator), a month for MONTH_OF_YEAR (?m) and inclusive dates for RANGE (?from/?to).
export type InsightsWindow = {
  periodType: BudgetPeriodType;
  anchor: string; // YYYY-MM
  month: number; // 1–12, MONTH_OF_YEAR only
  from: string | null;
  to: string | null;
};

// What one stats sample is: a line item, a whole bill (contract/income payments are their own
// samples in both), or the total of one day / week / month of the window (empty ones count as 0).
export const STAT_UNITS = ["item", "bill", "day", "week", "month"] as const;
export type StatUnit = (typeof STAT_UNITS)[number];
export const DEFAULT_STAT_UNIT: StatUnit = "bill";

export const STAT_KEYS = ["count", "sum", "mean", "median", "min", "max", "stdDev", "variance", "p90"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export const DEFAULT_STATS: StatKey[] = ["count", "sum", "mean", "median", "min", "max", "stdDev"];

export const BREAKDOWN_DIMENSIONS = ["weekday", "category", "counterparty", "tag"] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

export type SignedIds = {include: number[]; exclude: number[]};

export type IncomeSelection = {categoryIds: SignedIds; sourceIds: SignedIds};

export type InsightsQuery = {
  domain: InsightsDomain;
  window: InsightsWindow;
  unit: StatUnit;
  stats: StatKey[];
  by: BreakdownDimension;
  // Expense selectors; its tagIds also filter income.
  expense: FacetSelection;
  income: IncomeSelection;
};

// URL key per selector. Tags (`t`) are shared by both domains.
export const EXPENSE_PARAM_KEYS: Record<keyof FacetGroup, string> = {
  itemCategoryIds: "ic",
  contractCategoryIds: "cc",
  supplierCategoryIds: "sc",
  supplierIds: "s",
  tagIds: "t",
};
export const INCOME_PARAM_KEYS: Record<keyof IncomeSelection, string> = {
  categoryIds: "inc",
  sourceIds: "src",
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function read(source: ParamSource, key: string): string | null {
  if (source instanceof URLSearchParams) return source.get(key);
  const value = source[key];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export function parseSignedIds(value: string | null): SignedIds {
  const include: number[] = [];
  const exclude: number[] = [];
  for (const part of (value ?? "").split(",")) {
    const n = Number(part);
    if (!Number.isInteger(n) || n === 0) continue;
    const target = n > 0 ? include : exclude;
    if (!target.includes(Math.abs(n))) target.push(Math.abs(n));
  }
  // A value can't be both; include wins.
  return {include, exclude: exclude.filter((id) => !include.includes(id))};
}

export function serializeSignedIds({include, exclude}: SignedIds): string {
  return [...include.map(String), ...exclude.map((id) => `-${id}`)].join(",");
}

function isIsoDate(value: string | null): value is string {
  return value != null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function parseInsightsQuery(source: ParamSource): InsightsQuery {
  const rawDomain = read(source, "dom");
  const domain = (INSIGHTS_DOMAINS as readonly string[]).includes(rawDomain ?? "") ? (rawDomain as InsightsDomain) : "expense";

  const rawType = read(source, "p");
  const periodType = (BUDGET_PERIOD_TYPES as string[]).includes(rawType ?? "") ? (rawType as BudgetPeriodType) : "MONTHLY";
  const anchor = parseMonthAnchor(read(source, "at"));
  const rawMonth = Number(read(source, "m"));
  const month = Number.isInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12 ? rawMonth : anchor.getUTCMonth() + 1;
  const from = read(source, "from");
  const to = read(source, "to");

  const empty = (): FacetGroup => ({itemCategoryIds: [], contractCategoryIds: [], supplierCategoryIds: [], supplierIds: [], tagIds: []});
  const include = empty();
  const exclude = empty();
  for (const [field, key] of Object.entries(EXPENSE_PARAM_KEYS) as [keyof FacetGroup, string][]) {
    const ids = parseSignedIds(read(source, key));
    include[field] = ids.include;
    exclude[field] = ids.exclude;
  }

  const rawUnit = read(source, "u");
  const unit = (STAT_UNITS as readonly string[]).includes(rawUnit ?? "") ? (rawUnit as StatUnit) : DEFAULT_STAT_UNIT;
  const rawStats = read(source, "st");
  const picked = STAT_KEYS.filter((key) => (rawStats ?? "").split(",").includes(key));
  const stats = rawStats == null ? DEFAULT_STATS : picked;

  const rawBy = read(source, "by");
  const by = (BREAKDOWN_DIMENSIONS as readonly string[]).includes(rawBy ?? "") ? (rawBy as BreakdownDimension) : "category";

  return {
    domain,
    unit,
    stats,
    by,
    window: {
      periodType,
      anchor: monthKey(anchor),
      month,
      from: isIsoDate(from) ? from : null,
      to: isIsoDate(to) ? to : null,
    },
    expense: {include, exclude},
    income: {
      categoryIds: parseSignedIds(read(source, INCOME_PARAM_KEYS.categoryIds)),
      sourceIds: parseSignedIds(read(source, INCOME_PARAM_KEYS.sourceIds)),
    },
  };
}

// The canonical query string for a view: defaults omitted, the month anchor (?at) left out so the
// view always opens on the current period.
export function serializeViewQuery(query: InsightsQuery): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | null) => {
    if (value) params.set(key, value);
  };
  set("dom", query.domain === "expense" ? null : query.domain);
  set("p", query.window.periodType === "MONTHLY" ? null : query.window.periodType);
  if (query.window.periodType === "MONTH_OF_YEAR") set("m", String(query.window.month));
  if (query.window.periodType === "RANGE") {
    set("from", query.window.from);
    set("to", query.window.to);
  }
  for (const [field, key] of Object.entries(EXPENSE_PARAM_KEYS) as [keyof FacetGroup, string][]) {
    set(key, serializeSignedIds({include: query.expense.include[field], exclude: query.expense.exclude[field]}));
  }
  set(INCOME_PARAM_KEYS.categoryIds, serializeSignedIds(query.income.categoryIds));
  set(INCOME_PARAM_KEYS.sourceIds, serializeSignedIds(query.income.sourceIds));
  set("u", query.unit === DEFAULT_STAT_UNIT ? null : query.unit);
  const isDefaultStats = query.stats.length === DEFAULT_STATS.length && query.stats.every((key) => DEFAULT_STATS.includes(key));
  if (!isDefaultStats) params.set("st", query.stats.join(","));
  set("by", query.by === "category" ? null : query.by);
  return params.toString();
}

export type ValidIds = {
  itemCategoryIds: Set<number>;
  contractCategoryIds: Set<number>;
  supplierCategoryIds: Set<number>;
  supplierIds: Set<number>;
  tagIds: Set<number>;
  incomeCategoryIds: Set<number>;
  incomeSourceIds: Set<number>;
};

// Drops ids that no longer exist (a category deleted after a view was saved).
export function dropUnknownIds(query: InsightsQuery, valid: ValidIds): InsightsQuery {
  const keep = (ids: SignedIds, set: Set<number>): SignedIds => ({
    include: ids.include.filter((id) => set.has(id)),
    exclude: ids.exclude.filter((id) => set.has(id)),
  });
  const include = {...query.expense.include};
  const exclude = {...query.expense.exclude};
  for (const field of Object.keys(EXPENSE_PARAM_KEYS) as (keyof FacetGroup)[]) {
    const kept = keep({include: include[field], exclude: exclude[field]}, valid[field]);
    include[field] = kept.include;
    exclude[field] = kept.exclude;
  }
  return {
    ...query,
    expense: {include, exclude},
    income: {
      categoryIds: keep(query.income.categoryIds, valid.incomeCategoryIds),
      sourceIds: keep(query.income.sourceIds, valid.incomeSourceIds),
    },
  };
}
