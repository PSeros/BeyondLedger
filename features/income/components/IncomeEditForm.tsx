"use client";

import {useState} from "react";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateIncome} from "@/features/income/db/incomeMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import type {IncomeDetailData} from "@/features/income/db/incomeDetail";
import type {IncomeFormOptions} from "@/features/income/db/incomeFormOptions";

type IncomeEditFormProps = {
  income: IncomeDetailData;
  options: IncomeFormOptions;
};

export default function IncomeEditForm({income, options}: IncomeEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode is entered by pushing ?edit onto history. Leaving it must POP that entry with
  // router.back() (not push a fresh detail entry) so the modal's own close doesn't reopen edit;
  // refresh() then pulls the revalidated data into the detail view.
  function exitEdit() {
    router.back();
    router.refresh();
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await updateIncome(income.id, formData);
      exitEdit();
    } catch {
      setError("Could not save — please check the fields and try again.");
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <TextInputField label="Name" name="name" defaultValue={income.name} isRequired/>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SelectField label="Source" name="sourceId" options={options.sources} defaultValue={String(income.sourceId)}/>
        <SelectField label="Category" name="categoryId" options={options.categories} defaultValue={String(income.categoryId)}/>
        <SelectField label="Frequency" name="frequencyId" options={options.frequencies} defaultValue={String(income.frequencyId)}/>
        <TextInputField label="Amount (€)" name="amount" type="number" defaultValue={String(income.amount)} isRequired/>
        <TextInputField label="Start date" name="startDate" type="date" defaultValue={income.startDate.slice(0, 10)} isRequired/>
        <TextInputField label="End date" name="endDate" type="date" defaultValue={income.endDate?.slice(0, 10) ?? ""}/>
      </div>

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
