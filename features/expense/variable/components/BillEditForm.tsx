"use client";

import {useState} from "react";
import {Button, Input, Label, ListBox, Select, TextArea, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateBill} from "@/features/expense/variable/db/billMutations";
import type {BillDetailData} from "@/features/expense/variable/db/billDetail";
import type {BillFormOptions} from "@/features/expense/variable/db/billFormOptions";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";

const labelClass = "text-foreground-500 text-xs uppercase tracking-wide";

type BillEditFormProps = {
  bill: BillDetailData;
  options: BillFormOptions;
};

export default function BillEditForm({bill, options}: BillEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <SelectField label="Supplier" name="supplierId" options={options.suppliers} defaultId={bill.supplierId}/>
        <TextInputField label="Amount (€)" name="amount" type="number" defaultValue={String(bill.amount)} isRequired/>
        <TextInputField label="Date" name="date" type="date" defaultValue={bill.date.slice(0, 10)} isRequired/>
        <TextInputField label="Document number" name="documentNumber" defaultValue={bill.documentNumber ?? ""}/>
      </div>

      <TextField name="notes" defaultValue={bill.notes ?? ""} className="flex flex-col gap-1">
        <Label className={labelClass}>Notes</Label>
        <TextArea/>
      </TextField>

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

function TextInputField({
  label,
  name,
  defaultValue,
  type = "text",
  isRequired,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: "text" | "number" | "date";
  isRequired?: boolean;
}) {
  return (
    <TextField name={name} defaultValue={defaultValue} isRequired={isRequired} className="flex flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <Input type={type} step={type === "number" ? "any" : undefined}/>
    </TextField>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultId,
}: {
  label: string;
  name: string;
  options: FilterOption[];
  defaultId: number;
}) {
  return (
    <Select name={name} defaultSelectedKey={String(defaultId)} className="flex flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <Select.Trigger>
        <Select.Value/>
        <Select.Indicator/>
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
              {option.name}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
