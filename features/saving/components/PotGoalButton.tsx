"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, Popover, TextField} from "@heroui/react";
import {LuGoal} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {setSavingGoal} from "@/features/saving/db/savingGoal";

// Set, change or remove a pot's goal from its page.
export default function PotGoalButton({potId, goal}: {potId: number; goal: number | null}) {
  const t = useTranslations("saving");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(goal != null ? String(goal) : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: number | null) {
    setPending(true);
    setError(null);
    try {
      await setSavingGoal(potId, next);
      setOpen(false);
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
    } finally {
      setPending(false);
    }
  }

  const amount = Number(value.replace(",", "."));
  const valid = value.trim() !== "" && Number.isFinite(amount) && amount > 0;

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button size="sm" variant="tertiary">
        <LuGoal className="size-4"/>{goal != null ? t("editGoal") : t("setGoal")}
      </Button>
      <Popover.Content placement="bottom end">
        <Popover.Dialog className="flex w-64 flex-col gap-3 p-3">
          <TextField value={value} onChange={setValue} aria-label={t("goal")} className="flex flex-col gap-1">
            <Label className={labelClass}>{t("goal")}</Label>
            <Input type="number" inputMode="decimal" min="0" step="any" autoFocus/>
          </TextField>
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <div className="flex justify-between gap-2">
            {goal != null ? (
              <Button size="sm" variant="ghost" isDisabled={pending} onPress={() => save(null)}>{t("removeGoal")}</Button>
            ) : <span/>}
            <Button size="sm" variant="primary" isDisabled={pending || !valid} onPress={() => save(amount)}>{tCommon("save")}</Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
