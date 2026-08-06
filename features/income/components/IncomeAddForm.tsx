"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {createIncome} from "@/features/income/db/incomeMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import TagMultiSelect from "@/features/tags/components/TagMultiSelect";
import {createIncomeCategory, createIncomeSource, createTag} from "@/features/settings/db/referenceDataMutations";
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
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tIncome = useTranslations("income");
  const tErrors = useTranslations("errors");
  const tTags = useTranslations("tags");
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
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <TextInputField label={t("name")} name="name" isRequired/>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <CreatableSelect
          label={t("source")}
          name="sourceId"
          options={options.sources}
          createTitle={tForms("newIncomeSource")}
          onCreate={createIncomeSource}
        />
        <CreatableSelect
          label={t("category")}
          name="categoryId"
          options={options.categories}
          createTitle={tForms("newIncomeCategory")}
          onCreate={createIncomeCategory}
        />
        <SelectField label={t("frequency")} name="frequencyId" options={options.frequencies}/>
        <WorkspaceSelectField workspaces={options.workspaces} defaultValue={options.defaultWorkspaceId}/>
        <TextInputField label={t("amount")} name="amount" type="number" isRequired/>
        <TextInputField label={t("startDate")} name="startDate" type="date" defaultValue={today()} isRequired/>
        <TextInputField label={t("endDate")} name="endDate" type="date"/>
      </div>

      <TagMultiSelect label={tTags("label")} options={options.tags} onCreate={createTag}/>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={onClose}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? tCommon("saving") : tIncome("addIncome")}
        </Button>
      </div>
    </form>
  );
}
