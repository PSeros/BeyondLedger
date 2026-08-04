import type {CSSProperties} from "react";

// A small colored pill for a tag. HeroUI's Chip only accepts named theme colors, so this is a
// styled span driven by the tag's stored hex: a soft color-mix tint for the background/border and
// the color itself for the text (the same technique the accent chips use, e.g. BudgetEmptyState).
// Mid-tone palette colors (see features/tags/colors.ts) keep it legible in light and dark.
export default function TagChip({name, color}: {name: string; color: string}) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={
        {
          "--tag": color,
          backgroundColor: "color-mix(in oklab, var(--tag) 16%, transparent)",
          borderColor: "color-mix(in oklab, var(--tag) 30%, transparent)",
          color: "var(--tag)",
        } as CSSProperties
      }
    >
      {name}
    </span>
  );
}
