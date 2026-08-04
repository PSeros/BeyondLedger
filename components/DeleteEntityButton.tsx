"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {AlertDialog, Button} from "@heroui/react";
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

// A compact danger icon button that opens a HeroUI AlertDialog to confirm before deleting. Shared
// across every deletable entity (bills/contracts/income/budgets), so the trash affordance and its
// confirmation read the same everywhere. Reuses the common.* delete strings — no per-entity copy.
export default function DeleteEntityButton({id, action, label, redirectTo}: DeleteEntityButtonProps) {
  const router = useRouter();
  const t = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm(close: () => void) {
    setPending(true);
    setError(null);
    try {
      await action(id);
      close();
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
    <AlertDialog>
      <Button type="button" isIconOnly variant="danger-soft" size="sm" aria-label={t("delete")}>
        <LuTrash2 className="size-4"/>
      </Button>
      <AlertDialog.Backdrop variant="blur">
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            {({close}: {close: () => void}) => (
              <>
                <AlertDialog.Header>
                  <AlertDialog.Heading>{t("deleteConfirm", {label})}</AlertDialog.Heading>
                </AlertDialog.Header>
                {error ? (
                  <AlertDialog.Body>
                    <p className="text-danger text-sm">{error}</p>
                  </AlertDialog.Body>
                ) : null}
                <AlertDialog.Footer>
                  <Button type="button" variant="tertiary" isDisabled={pending} onPress={close}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" variant="danger" isDisabled={pending} onPress={() => onConfirm(close)}>
                    {pending ? t("deleting") : t("yesDelete")}
                  </Button>
                </AlertDialog.Footer>
              </>
            )}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
