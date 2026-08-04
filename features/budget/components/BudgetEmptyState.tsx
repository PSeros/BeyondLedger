import {getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuPiggyBank} from "react-icons/lu";
import BudgetFormButton from "@/features/budget/components/BudgetFormButton";
import type {BudgetMemberOptions} from "@/features/budget/db/budgets";

// Shown when no budgets exist at all — a labelled CTA to create the first one, instead of a blank
// grid. Mirrors ExpenseEmptyState. Chrome (title, toolbar) is provided by the Topbar + PageToolbar,
// so this is just the centered card.
export default async function BudgetEmptyState({options}: {options: BudgetMemberOptions}) {
  const t = await getTranslations("budget");

  return (
    <Card className="flex h-full items-center justify-center">
      <Card.Content className="flex max-w-sm flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
          <LuPiggyBank className="size-7"/>
        </span>
        <div>
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("emptyText")}</p>
        </div>
        <BudgetFormButton options={options} showLabel/>
      </Card.Content>
    </Card>
  );
}
