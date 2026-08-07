import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import PageToolbar from "@/components/PageToolbar";
import BudgetActions from "@/features/budget/components/BudgetActions";
import BudgetCard from "@/features/budget/components/BudgetCard";
import BudgetEmptyState from "@/features/budget/components/BudgetEmptyState";
import BudgetPeriodNavigator from "@/features/budget/components/BudgetPeriodNavigator";
import BudgetSearchField from "@/features/budget/components/BudgetSearchField";
import BudgetBarChart from "@/features/budget/components/BudgetBarChart";
import {getBudgetCount, getBudgetMemberOptions, getBudgetsResolved} from "@/features/budget/db/budgets";
import {BUDGET_PERIOD_TYPES, parseMonthAnchor} from "@/features/budget/period";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

// The Budget page: user-defined budgets (name + period + target + members), each showing target
// vs. actual vs. remaining for its own current period. Follows the expense/income layout — the
// Topbar auto-titles it; a PageToolbar holds a name/category search (?q) and a filter+add group
// (no fixed/variable tabs). No global period navigator — each card resolves its own window.
export default async function BudgetPage({searchParams}: {searchParams: Promise<{q?: string; period?: string; at?: string}>}) {
  const {q, period, at} = await searchParams;
  // Budgets belong to an account (Phase 14): the list is scoped to the active account (null = all).
  // The onboarding empty state uses the global count so a fresh account isn't mistaken for a fresh app.
  const activeWorkspaceId = await getActiveWorkspaceId();
  // The period navigator (?at=YYYY-MM) picks the anchor month; each card resolves its own period
  // containing it. Absent/invalid → the current month.
  const anchor = parseMonthAnchor(at);
  const [budgets, options, totalCount] = await Promise.all([
    getBudgetsResolved(anchor, activeWorkspaceId),
    getBudgetMemberOptions(),
    getBudgetCount(),
  ]);

  const query = (q ?? "").trim().toLowerCase();
  const periodFilter = (period ?? "").split(",").filter((p) => (BUDGET_PERIOD_TYPES as string[]).includes(p));

  const filtered = budgets.filter((budget) => {
    if (periodFilter.length && !periodFilter.includes(budget.periodType)) {
      return false;
    }
    if (query) {
      const haystack = [budget.name, ...budget.members.map((m) => m.name)].join(" ").toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const t = await getTranslations("budget");

  return (
    <div className="flex h-full flex-col">
      <PageToolbar
        left={
          <Suspense>
            <BudgetPeriodNavigator/>
          </Suspense>
        }
        center={
          <Suspense>
            <BudgetSearchField/>
          </Suspense>
        }
        right={<BudgetActions options={options}/>}
      />

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {totalCount === 0 ? (
          <BudgetEmptyState options={options}/>
        ) : filtered.length === 0 ? (
          <p className="text-muted py-16 text-center text-sm">{t("noResults")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            <BudgetBarChart budgets={filtered}/>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((budget) => (
                <BudgetCard key={budget.id} budget={budget} options={options}/>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
