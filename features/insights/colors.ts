// Series colours: a single series is just "the data" and takes the app accent; red/green only
// appear when expenses and income are shown side by side, where the colour carries meaning.
const DOMAIN_COLORS = {expense: "var(--danger)", income: "var(--success)"} as const;

export function seriesColor(key: "expense" | "income", seriesCount: number): string {
  return seriesCount > 1 ? DOMAIN_COLORS[key] : "var(--accent)";
}
