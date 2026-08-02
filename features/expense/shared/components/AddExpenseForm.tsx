"use client";

import {useState} from "react";
import {Button, Label, Tabs, TextArea, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {createBill} from "@/features/expense/variable/db/billMutations";
import {createContract} from "@/features/expense/fixed/db/contractMutations";
import BillItemsEditor, {
  formatCurrency,
  grandTotalOf,
  type ItemRow,
} from "@/features/expense/shared/components/BillItemsEditor";
import {labelClass, SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import SupplierSelectField from "@/features/expense/shared/components/SupplierSelectField";
import {createContractCategory, createItemCategory} from "@/features/settings/db/referenceDataMutations";
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
// swaps the field set: Variable creates a Bill (supplier/date/items or manual amount/notes),
// Fixed creates a Contract (name/category/supplier/frequency/amount/dates/notice). Only the
// active branch's inputs are mounted, so only they post; the toggle just picks which create
// action runs. On success the parent closes the modal and the list refreshes.
export default function AddExpenseForm({options, defaultType, onClose}: AddExpenseFormProps) {
  const router = useRouter();
  const [type, setType] = useState<AddExpenseType>(defaultType);
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasItems = rows.length > 0;
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
      setError("Could not save — please check the fields and try again.");
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
          <Tabs.List aria-label="Expense type">
            <Tabs.Tab id="variable">
              Variable
              <Tabs.Indicator/>
            </Tabs.Tab>
            <Tabs.Tab id="fixed">
              Fixed
              <Tabs.Indicator/>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {type === "variable" ? (
        <>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <SupplierSelectField
              name="supplierId"
              suppliers={options.suppliers}
              supplierCategories={options.supplierCategories}
            />
            <TextInputField label="Date" name="date" type="date" defaultValue={today()} isRequired/>
            <TextInputField label="Document number" name="documentNumber"/>
            {/* Amount is auto-summed from the items below when there are any; only a bill with no
                items takes a manually-entered amount. */}
            {hasItems ? null : <TextInputField label="Amount (€)" name="amount" type="number" isRequired/>}
          </div>

          <BillItemsEditor
            rows={rows}
            categories={options.itemCategories}
            onChange={setRows}
            onCreateCategory={createItemCategory}
          />

          <TextField name="notes" className="flex flex-col gap-1">
            <Label className={labelClass}>Notes</Label>
            <TextArea/>
          </TextField>

          {hasItems ? (
            <div
              className="flex items-center justify-between rounded-[var(--radius)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 py-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-semibold tabular-nums text-[var(--accent)]">{formatCurrency(grandTotal)}</span>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <TextInputField label="Name" name="name" isRequired/>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <SupplierSelectField
              name="supplierId"
              suppliers={options.suppliers}
              supplierCategories={options.supplierCategories}
            />
            <CreatableSelect
              label="Category"
              name="categoryId"
              options={options.contractCategories}
              createTitle="New contract category"
              onCreate={createContractCategory}
            />
            <SelectField label="Frequency" name="frequencyId" options={options.frequencies}/>
            <TextInputField label="Amount (€)" name="amount" type="number" isRequired/>
            <TextInputField label="Start date" name="startDate" type="date" defaultValue={today()} isRequired/>
            <TextInputField label="End date" name="endDate" type="date"/>
            <TextInputField label="Notice period (days)" name="noticePeriod" type="number"/>
            <TextInputField label="Document number" name="documentNumber"/>
          </div>
        </>
      )}

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? "Saving…" : "Add expense"}
        </Button>
      </div>
    </form>
  );
}
