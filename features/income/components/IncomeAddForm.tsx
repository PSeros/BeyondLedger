"use client";

import {useState} from "react";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {createIncome} from "@/features/income/db/incomeMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import {createIncomeCategory, createIncomeSource} from "@/features/settings/db/referenceDataMutations";
import type {IncomeFormOptions} from "@/features/income/db/incomeFormOptions";

// Today as yyyy-mm-dd, prefilled into the date field for the common "record what I just got" case.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type IncomeAddFormProps = {
  options: IncomeFormOptions;
  onClose: () => void;
};

// The income Add form. NO Variable/Fixed toggle — income is one model, so the chosen Frequency's
// isRecurring alone decides which tab the new row lands on. Source/category are creatable inline;
// on success the parent closes the modal and the list refreshes.
export default function IncomeAddForm({options, onClose}: IncomeAddFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await createIncome(formData);
      onClose();
      router.refresh();
    } catch {
      setError("Could not save — please check the fields and try again.");
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <TextInputField label="Name" name="name" isRequired/>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <CreatableSelect
          label="Source"
          name="sourceId"
          options={options.sources}
          createTitle="New income source"
          onCreate={createIncomeSource}
        />
        <CreatableSelect
          label="Category"
          name="categoryId"
          options={options.categories}
          createTitle="New income category"
          onCreate={createIncomeCategory}
        />
        <SelectField label="Frequency" name="frequencyId" options={options.frequencies}/>
        <TextInputField label="Amount (€)" name="amount" type="number" isRequired/>
        <TextInputField label="Start date" name="startDate" type="date" defaultValue={today()} isRequired/>
        <TextInputField label="End date" name="endDate" type="date"/>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? "Saving…" : "Add income"}
        </Button>
      </div>
    </form>
  );
}
