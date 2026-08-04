// The curated color palette a user picks from when creating/recoloring a tag. Colors are stored on
// the Tag as a hex string; DEFAULT_TAG_COLOR is applied when a tag is created without an explicit
// choice ("user input with a default"). Mid-tone hues so the color-mix tint in TagChip stays legible
// in both light and dark themes. isTagColor() guards persisted values before they reach the UI.

export const TAG_COLORS = [
  "#64748b", // slate
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const DEFAULT_TAG_COLOR: TagColor = "#6366f1";

export function isTagColor(value: string): value is TagColor {
  return (TAG_COLORS as readonly string[]).includes(value);
}

// Normalizes any incoming color string to a known palette value, falling back to the default. Used
// on write so a tag never persists an unrenderable color.
export function normalizeTagColor(value: string | null | undefined): TagColor {
  return value != null && isTagColor(value) ? value : DEFAULT_TAG_COLOR;
}
