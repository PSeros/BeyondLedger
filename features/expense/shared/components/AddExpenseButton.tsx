"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, ButtonGroup, Modal} from "@heroui/react";
import {LuPlus} from "react-icons/lu";
import AddExpenseForm, {type AddExpenseType} from "@/features/expense/shared/components/AddExpenseForm";
import type {ExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";

type AddExpenseButtonProps = {
  options: ExpenseFormOptions;
  defaultType: AddExpenseType;
};

// The Add button in the expense toolbar's ButtonGroup, opening the unified Add modal. Like
// BillFilterButton, `buttonProps` carries the `__button_group_child` marker ButtonGroup injects
// into its direct children — forward it to the real Button so it keeps its group styling. The
// modal is a controlled overlay (local open state) rather than an intercepted route: Add has no
// entity id, and interception routes have repeatedly corrupted the dev manifest here.
export default function AddExpenseButton({options, defaultType, ...buttonProps}: AddExpenseButtonProps) {
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
                <Modal.Heading className="block truncate text-base font-semibold">{t("expense.addExpense")}</Modal.Heading>
                <p className="mt-0.5 text-sm text-muted">{t("expense.addExpenseSubtitle")}</p>
              </div>
            </Modal.Header>
            {/* Scroll body spans into the dialog's p-6 (-mx-6) but re-insets its content (px-6)
                so the clip edge + scrollbar sit in the gutter, not over content / input rings. */}
            <Modal.Body className="-mx-6 px-6 py-1">
              <AddExpenseForm options={options} defaultType={defaultType} onClose={() => setOpen(false)}/>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
