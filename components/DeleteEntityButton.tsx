"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Popover} from "@heroui/react";
import {LuTrash2} from "react-icons/lu";
import {useRouter} from "next/navigation";

type DeleteEntityButtonProps = {
  id: number;
  // A bound server action that deletes the entity by id (deleteIncome / deleteBill / deleteContract / deleteBudget).
  action: (id: number) => Promise<void>;
  label: string;
  // Standalone detail pages / list cards pass the path to push to after deleting; a detail modal
  // omits it and navigates back (which closes the overlay).
  redirectTo?: string;
};

// A compact danger icon button whose confirm lives in a small Popover anchored right below it —
// lighter than a full dialog. Shared across every deletable entity (bills/contracts/income/
// budgets), so the trash affordance reads the same everywhere. Reuses the common.* delete strings.
export default function DeleteEntityButton({id, action, label, redirectTo}: DeleteEntityButtonProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setError(null);
    try {
      await action(id);
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.back();
      }
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : tErrors("couldNotDelete"));
      setPending(false);
    }
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button type="button" isIconOnly variant="danger-soft" size="sm" aria-label={t("delete")}>
        <LuTrash2 className="size-4"/>
      </Button>
      <Popover.Content placement="bottom end">
        <Popover.Dialog className="flex w-64 flex-col gap-3 p-3">
          <p className="text-sm">{t("deleteConfirm", {label})}</p>
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="tertiary" size="sm" isDisabled={pending} onPress={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="danger" size="sm" isDisabled={pending} onPress={onConfirm}>
              {pending ? t("deleting") : t("yesDelete")}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
