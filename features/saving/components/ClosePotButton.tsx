"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Modal} from "@heroui/react";
import {LuArchive, LuArchiveRestore} from "react-icons/lu";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import {closePot, reopenPot} from "@/features/saving/db/closePot";

const SURPLUS = "0";

// Close a pot from its page: the remaining balance goes to a chosen pot, or (default) to the Überschuss.
export function ClosePotButton({potId, potName, balance, otherPots}: {
  potId: number;
  potName: string;
  balance: number;
  otherPots: {id: number; name: string}[];
}) {
  const t = useTranslations("saving");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(SURPLUS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await closePot(potId, target === SURPLUS ? null : Number(target));
      setOpen(false);
      router.push("/saving");
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="tertiary" onPress={() => setOpen(true)}>
        <LuArchive className="size-4"/>{t("close")}
      </Button>
      <Modal.Backdrop isOpen={open} variant="blur" onOpenChange={setOpen}>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            <Modal.Header>
              <Modal.Heading className="text-base font-semibold">{t("closeTitle", {pot: potName})}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 text-foreground">
              <p className="text-sm">
                {t("closeBalance")} <span className="font-semibold tabular-nums">{format.number(balance, "currency")}</span>
              </p>
              {balance !== 0 ? (
                <CreatableSelect
                  label={t("closeMoveTo")}
                  options={[{id: Number(SURPLUS), name: t("surplus")}, ...otherPots]}
                  defaultValue={SURPLUS}
                  onSelect={setTarget}
                />
              ) : null}
              <p className="text-xs text-muted">{t("closeHint")}</p>
              {error ? <p className="text-danger text-xs">{error}</p> : null}
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="tertiary" isDisabled={pending} onPress={() => setOpen(false)}>{tCommon("cancel")}</Button>
              <Button variant="danger" isDisabled={pending} onPress={confirm}>{t("close")}</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

export function ReopenPotButton({potId}: {potId: number}) {
  const t = useTranslations("saving");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button size="sm" variant="tertiary" isDisabled={pending} onPress={async () => {
      setPending(true);
      await reopenPot(potId);
      router.refresh();
      setPending(false);
    }}>
      <LuArchiveRestore className="size-4"/>{t("reopen")}
    </Button>
  );
}
