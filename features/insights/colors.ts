import type {InsightsSeries} from "@/features/insights/params";

// Series colours: a single series is just "the data" and takes the app accent; red/green/blue only
// appear when several series are shown side by side, where the colour carries meaning.
const DOMAIN_COLORS: Record<InsightsSeries, string> = {
  expense: "var(--danger)",
  income: "var(--success)",
  saving: "var(--accent)",
};

export function seriesColor(key: InsightsSeries, seriesCount: number): string {
  return seriesCount > 1 ? DOMAIN_COLORS[key] : "var(--accent)";
}

// `insights.*` message key per series.
export const SERIES_LABEL_KEYS: Record<InsightsSeries, "domainExpense" | "domainIncome" | "domainSaving"> = {
  expense: "domainExpense",
  income: "domainIncome",
  saving: "domainSaving",
};
