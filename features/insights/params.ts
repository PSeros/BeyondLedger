// Type-only: budgetSmartMatch imports Prisma, and this module is also loaded on the client.
import type {FacetGroup, FacetSelection} from "@/features/budget/db/budgetSmartMatch";

// The Insights page state, all of it in the URL (shared by the page, the table/export API routes and,
// later, saved views). Neutral module: no "use client", so Server Components get real values.
//
// Signed id lists: `?ic=3,-7` includes item category 3 and excludes 7 — the budget tri-state, flat.

export const INSIGHTS_DOMAINS = ["expense", "income", "both"] as const;
export type InsightsDomain = (typeof INSIGHTS_DOMAINS)[number];

export const WINDOW_PRESETS = ["7", "30", "90", "365", "days", "range"] as const;
export type WindowPreset = (typeof WINDOW_PRESETS)[number];

export type InsightsWindow = {preset: WindowPreset; days: number; from: string | null; to: string | null};

export type SignedIds = {include: number[]; exclude: number[]};

export type IncomeSelection = {categoryIds: SignedIds; sourceIds: SignedIds};

export type InsightsQuery = {
  domain: InsightsDomain;
  window: InsightsWindow;
  // Expense selectors; its tagIds also filter income.
  expense: FacetSelection;
  income: IncomeSelection;
};

export const DEFAULT_WINDOW_DAYS = 30;
export const MAX_WINDOW_DAYS = 3660;

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

  const rawPreset = read(source, "w");
  const preset = (WINDOW_PRESETS as readonly string[]).includes(rawPreset ?? "") ? (rawPreset as WindowPreset) : "30";
  const rawDays = Number(read(source, "d"));
  const days = Number.isInteger(rawDays) && rawDays >= 1 ? Math.min(rawDays, MAX_WINDOW_DAYS) : DEFAULT_WINDOW_DAYS;
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

  return {
    domain,
    window: {preset, days, from: isIsoDate(from) ? from : null, to: isIsoDate(to) ? to : null},
    expense: {include, exclude},
    income: {
      categoryIds: parseSignedIds(read(source, INCOME_PARAM_KEYS.categoryIds)),
      sourceIds: parseSignedIds(read(source, INCOME_PARAM_KEYS.sourceIds)),
    },
  };
}
