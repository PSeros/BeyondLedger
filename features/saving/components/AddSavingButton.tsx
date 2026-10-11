"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Modal} from "@heroui/react";
import {LuPlus} from "react-icons/lu";
import SavingAddForm, {type SavingPreset} from "@/features/saving/components/SavingAddForm";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";

type AddSavingButtonProps = {
  options: SavingFormOptions;
  // Toolbar usage (default): an icon-only button. Empty-state usage passes showLabel to render a
  // full labelled primary CTA instead ("Add saving").
  showLabel?: boolean;
};

// Opens the Add modal. Controlled overlay (local open state), not an intercepted route: Add has no
// entity id, and interception routes corrupt the dev manifest here.
export default function AddSavingButton({options, showLabel = false}: AddSavingButtonProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        {...(showLabel ? {variant: "primary" as const} : {isIconOnly: true, variant: "tertiary" as const, "aria-label": t("common.add")})}
        onPress={() => setOpen(true)}
      >
        <LuPlus/>
        {showLabel ? t("saving.addSaving") : null}
      </Button>

      <SavingAddModal options={options} isOpen={open} onOpenChange={setOpen}/>
    </>
  );
}

// The Add modal, shared by the toolbar/empty-state button and the target card's Withdraw action.
export function SavingAddModal({options, preset, isOpen, onOpenChange}: {
  options: SavingFormOptions;
  preset?: SavingPreset;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("saving");
  const title = preset?.kind === "move" ? t("moveTitle") : preset?.kind === "plan" ? t("planTitle")
    : preset?.direction === "withdraw" ? t("withdraw") : preset ? t("deposit") : t("addSaving");
  return (
    <Modal.Backdrop isOpen={isOpen} variant="blur" onOpenChange={onOpenChange}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger/>
          <Modal.Header className="flex-row items-start gap-3">
            <div className="min-w-0 flex-1">
              <Modal.Heading className="block truncate text-base font-semibold">{title}</Modal.Heading>
              <p className="mt-0.5 text-sm text-muted">
                {preset?.kind === "move" ? t("moveHint") : t("addSavingSubtitle")}
              </p>
            </div>
          </Modal.Header>
          <Modal.Body className="-mx-6 px-6 py-1">
            <SavingAddForm options={options} preset={preset} onClose={() => onOpenChange(false)}/>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
