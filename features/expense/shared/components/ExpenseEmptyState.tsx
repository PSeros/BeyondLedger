import {getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuReceipt, LuRepeat} from "react-icons/lu";
import AddExpenseButton from "@/features/expense/shared/components/AddExpenseButton";
import {getExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";

type ExpenseEmptyStateProps = {
  variant: "variable" | "fixed";
};

// Shown on an expense tab whose list is entirely empty (no rows at all, not merely filtered to
// none) — so a fresh database reads as intentional, with a labelled CTA to add the first entry,
// instead of blank charts and an empty table. Mirrors IncomeEmptyState; the Add modal is the same
// unified one used from the toolbar (defaulted to this tab's type).
export default async function ExpenseEmptyState({variant}: ExpenseEmptyStateProps) {
  const t = await getTranslations("expense");
  const options = await getExpenseFormOptions();
  const isVariable = variant === "variable";

  return (
    <Card className="flex flex-1 items-center justify-center">
      <Card.Content className="flex max-w-sm flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
          {isVariable ? <LuReceipt className="size-7"/> : <LuRepeat className="size-7"/>}
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            {isVariable ? t("emptyVariableTitle") : t("emptyFixedTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isVariable ? t("emptyVariableText") : t("emptyFixedText")}
          </p>
        </div>
        <AddExpenseButton options={options} defaultType={variant} showLabel/>
      </Card.Content>
    </Card>
  );
}
