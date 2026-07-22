"use client";

import {useState} from "react";
import {Button, Input, Label, ListBox, Select, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateContract} from "@/features/expense/fixed/db/contractMutations";
import type {ContractDetailData} from "@/features/expense/fixed/db/contractDetail";
import type {ContractFilterOptions, FilterOption} from "@/features/expense/fixed/db/contractFilterOptions";

const labelClass = "text-foreground-500 text-xs uppercase tracking-wide";

type ContractEditFormProps = {
  contract: ContractDetailData;
  options: ContractFilterOptions;
};

export default function ContractEditForm({contract, options}: ContractEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailPath = `/expense/fixed/${contract.id}`;

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await updateContract(contract.id, formData);
      // Soft-navigate out of edit mode (drops ?edit); works for both the modal (stays
      // mounted) and the standalone page. refresh() pulls the revalidated data.
      router.push(detailPath);
      router.refresh();
    } catch {
      setError("Could not save — please check the fields and try again.");
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <TextInputField label="Name" name="name" defaultValue={contract.name} isRequired/>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SelectField label="Supplier" name="supplierId" options={options.suppliers} defaultId={contract.supplierId}/>
        <SelectField label="Category" name="categoryId" options={options.categories} defaultId={contract.categoryId}/>
        <SelectField label="Frequency" name="frequencyId" options={options.frequencies} defaultId={contract.frequencyId}/>
        <TextInputField label="Amount (€)" name="amount" type="number" defaultValue={String(contract.amount)} isRequired/>
        <TextInputField label="Start date" name="startDate" type="date" defaultValue={contract.startDate.slice(0, 10)} isRequired/>
        <TextInputField label="End date" name="endDate" type="date" defaultValue={contract.endDate?.slice(0, 10) ?? ""}/>
        <TextInputField
          label="Notice period (days)"
          name="noticePeriod"
          type="number"
          defaultValue={contract.noticePeriod != null ? String(contract.noticePeriod) : ""}
        />
        <TextInputField label="Document number" name="documentNumber" defaultValue={contract.documentNumber ?? ""}/>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={() => router.push(detailPath)}>
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
