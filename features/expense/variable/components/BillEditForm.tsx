"use client";

import {useMemo, useState} from "react";
import {Button, Label, TextArea, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateBill} from "@/features/expense/variable/db/billMutations";
import BillItemsEditor, {
  formatCurrency,
  grandTotalOf,
  itemRowFromDetail,
  type ItemRow,
} from "@/features/expense/shared/components/BillItemsEditor";
import {labelClass, TextInputField} from "@/features/expense/shared/components/FormFields";
import SupplierSelectField from "@/features/expense/shared/components/SupplierSelectField";
import {createItemCategory} from "@/features/settings/db/referenceDataMutations";
import type {BillDetailData} from "@/features/expense/variable/db/billDetail";
import type {BillFormOptions} from "@/features/expense/variable/db/billFormOptions";

type BillEditFormProps = {
  bill: BillDetailData;
  options: BillFormOptions;
};

export default function BillEditForm({bill, options}: BillEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ItemRow[]>(() => bill.items.map(itemRowFromDetail));

  const grandTotal = useMemo(() => grandTotalOf(rows), [rows]);
  const hasItems = rows.length > 0;

  // Edit mode is entered by pushing ?edit onto history (EditLink / Cancel target). Leaving it
  // must POP that entry with router.back(), not push a fresh detail entry — otherwise the
  // ?edit entry is left dangling forward and the modal's own close (router.back()) lands back
  // on it, reopening edit. refresh() then pulls the revalidated data into the detail view.
  function exitEdit() {
    router.back();
    router.refresh();
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await updateBill(bill.id, formData);
      exitEdit();
    } catch {
      setError("Could not save — please check the fields and try again.");
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SupplierSelectField
          name="supplierId"
          suppliers={options.suppliers}
          supplierCategories={options.supplierCategories}
          defaultValue={String(bill.supplierId)}
        />
        <TextInputField label="Date" name="date" type="date" defaultValue={bill.date.slice(0, 10)} isRequired/>
        <TextInputField label="Document number" name="documentNumber" defaultValue={bill.documentNumber ?? ""}/>
        {/* Amount is auto-summed from the items below when there are any; only a bill left with no
            items keeps a manually-entered amount. */}
        {hasItems ? null : (
          <TextInputField label="Amount (€)" name="amount" type="number" defaultValue={String(bill.amount)} isRequired/>
        )}
      </div>

      <BillItemsEditor
        rows={rows}
        categories={options.itemCategories}
        onChange={setRows}
        onCreateCategory={createItemCategory}
      />

      <TextField name="notes" defaultValue={bill.notes ?? ""} className="flex flex-col gap-1">
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

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
