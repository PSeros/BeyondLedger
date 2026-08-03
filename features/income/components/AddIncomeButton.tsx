"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, ButtonGroup, Modal} from "@heroui/react";
import {LuPlus} from "react-icons/lu";
import IncomeAddForm from "@/features/income/components/IncomeAddForm";
import type {IncomeFormOptions} from "@/features/income/db/incomeFormOptions";

type AddIncomeButtonProps = {
  options: IncomeFormOptions;
};

// The Add button in the income toolbar's ButtonGroup, opening the Add modal. `buttonProps` carries
// the `__button_group_child` marker ButtonGroup injects into its direct children — forward it to the
// real Button so it keeps its group styling. Controlled overlay (local open state), not an
// intercepted route: Add has no entity id, and interception routes corrupt the dev manifest here.
export default function AddIncomeButton({options, ...buttonProps}: AddIncomeButtonProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button {...buttonProps} aria-label={t("common.add")} onPress={() => setOpen(true)}>
        <ButtonGroup.Separator/>
        <LuPlus/>
      </Button>

      <Modal.Backdrop isOpen={open} variant="blur" onOpenChange={setOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            <Modal.Header className="flex-row items-start gap-3">
              <div className="min-w-0 flex-1">
                <Modal.Heading className="block truncate text-base font-semibold">{t("income.addIncome")}</Modal.Heading>
                <p className="mt-0.5 text-sm text-muted">
                  {t("income.addIncomeSubtitle")}
                </p>
              </div>
            </Modal.Header>
            <Modal.Body className="-mx-6 px-6 py-1">
              <IncomeAddForm options={options} onClose={() => setOpen(false)}/>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
