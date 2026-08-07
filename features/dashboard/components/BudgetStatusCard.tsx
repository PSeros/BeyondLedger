import Link from "next/link";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card, Chip} from "@heroui/react";
import {getBudgetsResolved} from "@/features/budget/db/budgets";
import {isBudgetActiveInMonth, parseMonthAnchor} from "@/features/budget/period";

// Dashboard budget status (Phase 12): the budgets closest to (or over) their cap this period, as
// compact meter rows linking to /budget. Reuses getBudgetsResolved + BudgetCard's meter color logic.
const MAX_ROWS = 5;

export default async function BudgetStatusCard({workspaceId}: {workspaceId?: number | null}) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const format = await getFormatter();

  // The dashboard has no month navigator — it's always the current month. A RANGE budget whose span
  // doesn't cover this month is dropped (same rule as the budget page, anchored to today's month).
  const now = new Date();
  const monthStart = parseMonthAnchor(undefined, now);
  const budgets = (await getBudgetsResolved(now, workspaceId)).filter((budget) =>
    isBudgetActiveInMonth(budget, monthStart),
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
