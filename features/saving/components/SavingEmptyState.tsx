import {getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuHandCoins} from "react-icons/lu";
import AddSavingButton from "@/features/saving/components/AddSavingButton";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";

// No pot has ever been paid into (on this account): one way in, instead of empty charts.
export default async function SavingEmptyState({options}: {options: SavingFormOptions}) {
  const t = await getTranslations("saving");
  return (
    <Card className="flex flex-1 items-center justify-center">
      <Card.Content className="flex max-w-sm flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
          <LuHandCoins className="size-7"/>
        </span>
        <div>
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("emptyText")}</p>
        </div>
        <AddSavingButton options={options} showLabel/>
      </Card.Content>
    </Card>
  );
}
