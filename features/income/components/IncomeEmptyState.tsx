import {getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuBanknote, LuRepeat} from "react-icons/lu";
import AddIncomeButton from "@/features/income/components/AddIncomeButton";
import {getIncomeFormOptions} from "@/features/income/db/incomeFormOptions";

type IncomeEmptyStateProps = {
  isRecurring: boolean;
};

// Shown on a tab whose Income table is entirely empty (no rows at all, not merely filtered to
// none) — so a fresh database reads as intentional, with a direct way to add the first entry,
// instead of blank charts and an empty table.
export default async function IncomeEmptyState({isRecurring}: IncomeEmptyStateProps) {
  const t = await getTranslations("income");
  const options = await getIncomeFormOptions();

  return (
    <Card className="flex flex-1 items-center justify-center">
      <Card.Content className="flex max-w-sm flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
          {isRecurring ? <LuRepeat className="size-7"/> : <LuBanknote className="size-7"/>}
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            {isRecurring ? t("emptyFixedTitle") : t("emptyVariableTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isRecurring ? t("emptyFixedText") : t("emptyVariableText")}
          </p>
        </div>
        <AddIncomeButton options={options} showLabel/>
      </Card.Content>
    </Card>
  );
}
