"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {createSaving} from "@/features/saving/db/savingMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import TagMultiSelect from "@/features/tags/components/TagMultiSelect";
import {createSavingTarget, createTag} from "@/features/settings/db/referenceDataMutations";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";
import SavingDirectionTabs, {type SavingDirection} from "@/features/saving/components/SavingDirectionTabs";

// Today as yyyy-mm-dd, prefilled into the date field for the common "record what I just got" case.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type SavingPreset = {targetId: string; direction: SavingDirection};

type SavingAddFormProps = {
  options: SavingFormOptions;
  // Set by the target card's Withdraw action: that target, a one-off, Withdraw selected.
  preset?: SavingPreset;
  onClose: () => void;
};

// The saving Add form. The chosen Frequency decides the tab; the target is creatable inline.
export default function SavingAddForm({options, preset, onClose}: SavingAddFormProps) {
  const router = useRouter();
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tSaving = useTranslations("saving");
  const tErrors = useTranslations("errors");
  const tTags = useTranslations("tags");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await createSaving(formData);
      onClose();
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <SavingDirectionTabs defaultValue={preset?.direction}/>
      <TextInputField label={t("name")} name="name" isRequired/>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CreatableSelect
          label={t("target")}
          name="targetId"
          options={options.targets}
          defaultValue={preset?.targetId}
          createTitle={tForms("newSavingTarget")}
          onCreate={createSavingTarget}
          isRequired
        />
        <SelectField
          label={t("frequency")}
          name="frequencyId"
          options={options.frequencies}
          defaultValue={preset ? options.oneOffFrequencyId : undefined}
          isRequired
        />
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
          {pending ? tCommon("saving") : tSaving("addSaving")}
        </Button>
      </div>
    </form>
  );
}
