"use client";

import {useTranslations} from "next-intl";
import BudgetCard from "@/features/budget/components/BudgetCard";
import BudgetFormButton from "@/features/budget/components/BudgetFormButton";
import type {BudgetMemberOptions, BudgetResolved} from "@/features/budget/db/budgets";

// Budget page shell. The (app) main is overflow-hidden, so this is h-full flex-col with its own
// inner overflow-y-auto body (same pattern as the Settings manager). Each card shows its own
// current period — there is no global navigator.
export default function BudgetManager({
  budgets,
  options,
}: {
  budgets: BudgetResolved[];
  options: BudgetMemberOptions;
}) {
  const t = useTranslations("budget");

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-default-200 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        <BudgetFormButton options={options}/>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} options={options}/>
          ))}
        </div>
      </div>
    </div>
  );
}
