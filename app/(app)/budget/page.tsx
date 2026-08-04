import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import PageToolbar from "@/components/PageToolbar";
import BudgetActions from "@/features/budget/components/BudgetActions";
import BudgetCard from "@/features/budget/components/BudgetCard";
import BudgetEmptyState from "@/features/budget/components/BudgetEmptyState";
import BudgetSearchField from "@/features/budget/components/BudgetSearchField";
import {getBudgetMemberOptions, getBudgetsResolved} from "@/features/budget/db/budgets";
import {BUDGET_PERIOD_TYPES} from "@/features/budget/period";

// The Budget page: user-defined budgets (name + period + target + members), each showing target
// vs. actual vs. remaining for its own current period. Follows the expense/income layout — the
// Topbar auto-titles it; a PageToolbar holds a name/category search (?q) and a filter+add group
// (no fixed/variable tabs). No global period navigator — each card resolves its own window.
export default async function BudgetPage({searchParams}: {searchParams: Promise<{q?: string; period?: string}>}) {
  const {q, period} = await searchParams;
  const [budgets, options] = await Promise.all([getBudgetsResolved(), getBudgetMemberOptions()]);

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
        left={null}
        center={
          <Suspense>
            <BudgetSearchField/>
          </Suspense>
        }
        right={<BudgetActions options={options}/>}
      />

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {budgets.length === 0 ? (
          <BudgetEmptyState options={options}/>
        ) : filtered.length === 0 ? (
          <p className="text-muted py-16 text-center text-sm">{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((budget) => (
              <BudgetCard key={budget.id} budget={budget} options={options}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
