"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Popover} from "@heroui/react";
import {LuHandCoins} from "react-icons/lu";
import {useRouter} from "next/navigation";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import {createSavingTarget} from "@/features/settings/db/referenceDataMutations";
import {convertContractToSaving} from "@/features/saving/db/convertContract";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// On a contract's detail: "this is really a savings plan" → move it (with history, tags, files) to /saving.
export default function ConvertToSavingButton({contractId, targets}: {contractId: number; targets: FilterOption[]}) {
  const router = useRouter();
  const t = useTranslations("saving");
  const tFields = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setError(null);
    try {
      const saving = await convertContractToSaving(contractId, Number(targetId));
      setOpen(false);
      router.push(`/saving/entry/${saving.id}`);
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button type="button" isIconOnly variant="tertiary" size="sm" aria-label={t("convert")}>
        <LuHandCoins className="size-4"/>
      </Button>
      <Popover.Content placement="bottom end">
        <Popover.Dialog className="flex w-72 flex-col gap-3 p-3">
          <p className="text-sm">{t("convertConfirm")}</p>
          <CreatableSelect
            label={tFields("target")}
            options={targets}
            onSelect={setTargetId}
            createTitle={tForms("newSavingTarget")}
            onCreate={createSavingTarget}
          />
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="tertiary" size="sm" isDisabled={pending} onPress={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="primary" size="sm" isDisabled={pending || !targetId} onPress={onConfirm}>
              {t("convert")}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
