// Pure, client-safe helpers for the dashboard half-donuts (no Prisma import, so the client chart can
// use it). A categorical palette + a threshold that folds the long tail of tiny slices into a single
// "Other" slice, so a donut stays readable instead of shattering into hairline arcs.
export type DonutSlice = {id: number; label: string; amount: number; count: number};

// Distinct, mid-lightness hues that hold up on both the light and dark card surface. The first is the
// app accent so the chart feels native; the rest fan out around the wheel.
export const PALETTE = [
  "var(--accent)",
  "oklch(73% 0.17 150)", // green
  "oklch(78% 0.15 70)", // amber
  "oklch(66% 0.20 25)", // red
  "oklch(70% 0.15 300)", // violet
  "oklch(72% 0.13 195)", // teal
  "oklch(74% 0.15 125)", // lime
  "oklch(68% 0.16 340)", // pink
  "oklch(70% 0.13 255)", // blue
];

// The muted "Other" bucket colour.
export const OTHER_COLOR = "var(--muted)";

// Colour for slice `index`; the folded "Other" slice (id -1) is always muted.
export function sliceColor(row: DonutSlice, index: number): string {
  return row.id === -1 ? OTHER_COLOR : PALETTE[index % PALETTE.length];
}

// Fold small long-tail slices into one "Other" slice. Rows must be sorted by amount desc. Keeps at
// most `maxSlices` real slices and only those holding at least `minShare` of the total; the remainder
// collapses into "Other" — unless that would fold just one slice, in which case it's kept as itself.
export function collapseSmall(
  rows: DonutSlice[],
  otherLabel: string,
  opts: {maxSlices?: number; minShare?: number} = {},
): DonutSlice[] {
  const maxSlices = opts.maxSlices ?? 8;
  const minShare = opts.minShare ?? 0.03;
  // Non-positive slices are dropped before anything else: a donut draws shares of a total, and a
  // category CAN net out at or below zero now that bill lines may be negative (a Pfand/Leergut
  // return, a refund). Recharts turns a negative value into a backwards arc that overlaps its
  // neighbours, so such a category simply has no share to show.
  const positive = rows.filter((row) => row.amount > 0);
  const total = positive.reduce((sum, row) => sum + row.amount, 0) || 1;

  const kept = positive.filter((row) => row.amount / total >= minShare).slice(0, maxSlices);
  const dropped = positive.filter((row) => !kept.includes(row));

  if (dropped.length === 1) {
    return [...kept, dropped[0]];
  }
  if (dropped.length > 0) {
    return [
      ...kept,
      {
        id: -1,
        label: otherLabel,
        amount: dropped.reduce((sum, row) => sum + row.amount, 0),
        count: dropped.reduce((sum, row) => sum + row.count, 0),
      },
    ];
  }
  return kept;
}
