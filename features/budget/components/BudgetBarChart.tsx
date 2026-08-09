"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import type {BudgetResolved} from "@/features/budget/db/budgets";

// Budget bar chart — bullet layout, utilization scale. Each budget is a clean horizontal row (name
// left, bar centre, absolute spent/target right, from the bullet idea) but the bar is drawn on a
// PERCENT-OF-OWN-TARGET scale (from the utilization idea): 100% is the cap, marked by a tick line,
// bars share one 0–max% axis so they're comparable, and colour goes green → amber → red as each
// nears and passes its target. Sorted most-used first. Reflects the page's filtered set.
export default function BudgetBarChart({budgets}: {budgets: BudgetResolved[]}) {
  const format = useFormatter();
  const t = useTranslations("budget");

  const rows = budgets
    .map((budget) => {
      // TODO: move to budgetProgress() in features/budget/progress.ts. The 150 is a bar-length
      // rendering hack for a target-less budget (the shared helper reports 100), so switching it
      // changes what this chart draws — worth a look, but not a mechanical swap.
      const pct = budget.target > 0 ? (budget.actual / budget.target) * 100 : budget.actual > 0 ? 150 : 0;
      return {budget, pct};
    })
    .sort((a, b) => b.pct - a.pct);

  // One shared axis so bar lengths are comparable; always show a little room past 100% so the cap
  // tick and any overspend are visible even when nothing is over budget.
  const domainMax = Math.max(120, ...rows.map((row) => row.pct));
  const capLeft = (100 / domainMax) * 100;

  return (
    <Card className="min-h-fit shrink-0">
      <Card.Header>
        <p className="text-sm">{t("chartTitle")}</p>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3 pt-2">
        {rows.map(({budget, pct}) => {
          const over = pct > 100;
          const color = over ? "var(--danger)" : pct >= 85 ? "var(--warning)" : "var(--success)";
          const fillPct = pct > 0 ? Math.max(2, (pct / domainMax) * 100) : 0;

          return (
            // The fixed rails (name + pct + amounts + gaps) came to ~248px, which collapsed the bar
            // to nothing on a phone. Below sm the name takes its own line and the absolute figures
            // drop out — they are repeated on every BudgetCard directly below this chart.
            <div key={budget.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="w-full truncate text-sm sm:w-28 sm:shrink-0" title={budget.name}>{budget.name}</span>

              <div className="relative h-4 min-w-24 flex-1 overflow-hidden rounded-full bg-default">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{width: `${fillPct}%`, background: color}}
                />
                {/* 100% cap — the target line every bar is measured against. */}
                <div
                  className="absolute inset-y-0 w-0.5"
                  style={{left: `calc(${capLeft}% - 1px)`, background: "color-mix(in srgb, var(--foreground) 65%, transparent)"}}
                  title="100%"
                />
              </div>

              <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums" style={{color}}>
                {Math.round(pct)}%
              </span>
              <span className="hidden w-32 shrink-0 text-right text-xs tabular-nums text-muted sm:block">
                {format.number(budget.actual, "currencyWhole")} / {format.number(budget.target, "currencyWhole")}
              </span>
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
}
