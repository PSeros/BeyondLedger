"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, Label, Tabs, TextArea, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {createBill} from "@/features/expense/variable/db/billMutations";
import {createContract} from "@/features/expense/fixed/db/contractMutations";
import BillItemsEditor, {
  emptyRow,
  grandTotalOf,
  type ItemRow,
} from "@/features/expense/shared/components/BillItemsEditor";
import {labelClass, SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import SupplierSelectField from "@/features/expense/shared/components/SupplierSelectField";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import TagMultiSelect from "@/features/tags/components/TagMultiSelect";
import {createContractCategory, createItemCategory, createTag} from "@/features/settings/db/referenceDataMutations";
import type {ExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";

export type AddExpenseType = "variable" | "fixed";

// Today's date as yyyy-mm-dd, prefilled into the date fields so the common "record what I just
// spent today" case needs no date entry.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type AddExpenseFormProps = {
  options: ExpenseFormOptions;
  defaultType: AddExpenseType;
  onClose: () => void;
};

// The unified Add form. A Variable/Fixed toggle (defaulted from the page it was opened on)
// swaps the field set: Variable creates a Bill (supplier/date/items/notes — the total is always
// the sum of the items, so the form starts with one row and never posts a bare amount),
// Fixed creates a Contract (name/category/supplier/frequency/amount/dates/notice). Only the
// active branch's inputs are mounted, so only they post; the toggle just picks which create
// action runs. On success the parent closes the modal and the list refreshes.
export default function AddExpenseForm({options, defaultType, onClose}: AddExpenseFormProps) {
  const router = useRouter();
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tExpense = useTranslations("expense");
  const tErrors = useTranslations("errors");
  const tTags = useTranslations("tags");
  const tVf = useTranslations("vf");
  const format = useFormatter();
  const [type, setType] = useState<AddExpenseType>(defaultType);
  // A bill always has at least one item, so open with one empty row on the first category.
  const [rows, setRows] = useState<ItemRow[]>(() => [
    emptyRow(options.itemCategories[0] ? String(options.itemCategories[0].id) : ""),
  ]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grandTotal = grandTotalOf(rows);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      if (type === "variable") {
        await createBill(formData);
      } else {
        await createContract(formData);
      }
      onClose();
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <Tabs
        className="w-fit"
        selectedKey={type}
        onSelectionChange={(key) => setType(String(key) as AddExpenseType)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={tForms("expenseType")}>
            <Tabs.Tab id="fixed">
              {tVf("fixed")}
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="variable">
              {tVf("variable")}
              <Tabs.Indicator/>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {type === "variable" ? (
        <>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <SupplierSelectField
              name="supplierId"
              suppliers={options.suppliers}
              supplierCategories={options.supplierCategories}
              isRequired
            />
            <WorkspaceSelectField workspaces={options.workspaces} defaultValue={options.defaultWorkspaceId}/>
            <TextInputField label={t("date")} name="date" type="date" defaultValue={today()} isRequired/>
            <TextInputField label={t("documentNumber")} name="documentNumber"/>
          </div>

          <BillItemsEditor
            rows={rows}
            categories={options.itemCategories}
            tags={options.tags}
            onChange={setRows}
            onCreateCategory={createItemCategory}
            onCreateTag={createTag}
          />

          <TagMultiSelect label={tTags("label")} options={options.tags} onCreate={createTag}/>

          <TextField name="notes" className="flex flex-col gap-1">
            <Label className={labelClass}>{t("notes")}</Label>
            <TextArea/>
          </TextField>

          <div
            className="flex items-center justify-between rounded-[var(--radius)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 py-3">
            <span className="text-sm font-medium">{t("total")}</span>
            <span
              className="text-lg font-semibold tabular-nums text-[var(--accent)]">{format.number(grandTotal, "currency")}</span>
          </div>
        </>
      ) : (
        <>
          <TextInputField label={t("name")} name="name" isRequired/>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <SupplierSelectField
              name="supplierId"
              suppliers={options.suppliers}
              supplierCategories={options.supplierCategories}
              isRequired
            />
            <CreatableSelect
              label={t("category")}
              name="categoryId"
              options={options.contractCategories}
              createTitle={tForms("newContractCategory")}
              onCreate={createContractCategory}
              isRequired
            />
            <SelectField label={t("frequency")} name="frequencyId" options={options.frequencies} isRequired/>
            <WorkspaceSelectField workspaces={options.workspaces} defaultValue={options.defaultWorkspaceId}/>
            <TextInputField label={t("amount")} name="amount" type="number" isRequired/>
            <TextInputField label={t("startDate")} name="startDate" type="date" defaultValue={today()} isRequired/>
            <TextInputField label={t("endDate")} name="endDate" type="date"/>
            <TextInputField label={t("noticePeriod")} name="noticePeriod" type="number"/>
            <TextInputField label={t("documentNumber")} name="documentNumber"/>
          </div>
          <TagMultiSelect label={tTags("label")} options={options.tags} onCreate={createTag}/>
        </>
      )}

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? tCommon("saving") : tExpense("addExpense")}
        </Button>
      </div>
    </form>
  );
}
