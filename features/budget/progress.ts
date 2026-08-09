// Pure, client-safe progress math for budgets: target vs. actual → remaining / over / ratio /
// percent. Kept free of the Prisma client (like period.ts) so the cards, the charts and the
// background MQTT publisher all derive the same numbers.
//
// This exists because the rule was previously inlined in three places that DISAGREED on the
// degenerate case of a budget with a zero/absent target and non-zero spend — 0%, 150% and Infinity
// respectively. The canonical rule below is the Infinity one, because it is the only variant that
// sorts correctly ("most over budget first") and the only one that doesn't claim a budget with
// spend is at 0% usage.

export type BudgetProgress = {
  /// target - actual; negative once overspent.
  remaining: number;
  /// Overspent. With a non-positive target, any spend at all counts as over.
  isOver: boolean;
  /// actual / target. Infinity when the target is non-positive but there is spend; 0 when neither.
  /// Use this for sorting, not for display.
  ratio: number;
  /// ratio * 100, UNCLAMPED (130% is the interesting case) but always finite — the Infinity ratio
  /// is reported as 100 so it can be rendered and published as a number.
  percent: number;
  /// percent clamped to 0..100 and rounded, for progress bars and meters.
  meterPercent: number;
};

export function budgetProgress(target: number, actual: number): BudgetProgress {
  const remaining = target - actual;
  const ratio = target > 0 ? actual / target : actual > 0 ? Infinity : 0;
  const percent = Number.isFinite(ratio) ? ratio * 100 : 100;

  return {
    remaining,
    isOver: remaining < 0,
    ratio,
    percent,
    meterPercent: Math.min(100, Math.round(percent)),
  };
}
