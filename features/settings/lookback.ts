// Bounds and options for the Ø-baseline preference (AppSettings.lookback* + baselineMetric).
//
// Deliberately a NEUTRAL module — no "use client", no Prisma import — because both sides need these:
// the server action validates against them and the client form uses them for its input max/guard.
// Keeping them in features/settings/db/appSettings.ts would drag the Prisma client into the browser
// bundle (which is exactly what it did, and the build refused it).
//
// Ceilings, not correctness limits: the data horizon already truncates the average to the periods
// that actually hold records. These just stop a typo from spanning two centuries of chart windows.
export const MAX_LOOKBACK_WEEKS = 52;
export const MAX_LOOKBACK_MONTHS = 24;
export const MAX_LOOKBACK_YEARS = 10;

// Which statistic the lookback samples are reduced to (AppSettings.baselineMetric). Mirrors the
// Prisma enum, restated here so the client form never imports the generated client.
export const BASELINE_METRICS = ["MEAN", "MEDIAN"] as const;
export type BaselineMetric = (typeof BASELINE_METRICS)[number];

export const DEFAULT_BASELINE_METRIC: BaselineMetric = "MEDIAN";

export function normalizeBaselineMetric(value: string | null | undefined): BaselineMetric {
  return (BASELINE_METRICS as readonly string[]).includes(value ?? "")
    ? (value as BaselineMetric)
    : DEFAULT_BASELINE_METRIC;
}
