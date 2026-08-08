import Link from "next/link";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card, Chip} from "@heroui/react";
import {getBudgetsResolved} from "@/features/budget/db/budgets";
import {isBudgetActiveInWindow} from "@/features/budget/period";
import {addDays, chartWindow, type Granularity, utcDate} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard budget status (Phase 12): the budgets closest to (or over) their cap this period, as
// compact meter rows linking to /budget. Reuses getBudgetsResolved + BudgetCard's meter color logic.
const MAX_ROWS = 5;

export default async function BudgetStatusCard({
  workspaceId,
  granularity,
  offset,
}: {workspaceId?: number | null; granularity: Granularity; offset: number}) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();

  // Follow the dashboard period: anchor to a date inside the selected window, clamped to today so we
  // never show forecast actuals (offset 0 → today; a past period → its last day; a future one → its
  // first day). Each budget still resolves its OWN period type around that date. RANGE budgets are
  // kept when their span overlaps the whole selected window (not just the anchor month), so a range
  // that lands anywhere in, e.g., the viewed year still surfaces.
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const window = chartWindow(granularity, offset, today);
  const lastDay = addDays(window.end, -1);
  const anchor = today < window.start ? window.start : today > lastDay ? lastDay : today;
  const budgets = (await getBudgetsResolved(anchor, workspaceId)).filter((budget) =>
    isBudgetActiveInWindow(budget, window.start, window.end),
  );
  const ranked = budgets
    .map((budget) => {
      const ratio = budget.target > 0 ? budget.actual / budget.target : budget.actual > 0 ? Infinity : 0;
      return {budget, ratio};
    })
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, MAX_ROWS);

  return (
    <Card className="h-full">
      <Card.Header>
        <p className="text-sm">{t("budgetStatusTitle")}</p>
      </Card.Header>

      <Card.Content className="scrollbar-hide -mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-2">
        {ranked.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted">{tCommon("noData")}</p>
        ) : (
          ranked.map(({budget, ratio}) => {
            const isOver = ratio > 1;
            const meterPct = Math.min(100, Math.round((Number.isFinite(ratio) ? ratio : 1) * 100));
            const meterColor = isOver ? "bg-danger" : ratio >= 0.85 ? "bg-warning" : "bg-success";
            const remaining = budget.target - budget.actual;

            return (
              <Link
                key={budget.id}
                href="/budget"
                className="hover:bg-default flex flex-col gap-1.5 rounded-[var(--radius)] px-2 py-1 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{budget.name}</span>
                  <Chip variant="soft" color={isOver ? "danger" : "success"} size="sm" className="h-fit shrink-0">
                    <Chip.Label>
                      {isOver
                        ? t("overBy", {amount: format.number(-remaining, "currencyWhole")})
                        : t("remaining", {amount: format.number(remaining, "currencyWhole")})}
                    </Chip.Label>
                  </Chip>
                </div>
                <p className="text-xs text-muted tabular-nums">
                  {format.number(budget.actual, "currencyWhole")} / {format.number(budget.target, "currencyWhole")}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-default">
                  <div className={`h-full rounded-full ${meterColor}`} style={{width: `${Math.max(4, meterPct)}%`}}/>
                </div>
              </Link>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}
