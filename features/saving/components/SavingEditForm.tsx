"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateSaving} from "@/features/saving/db/savingMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import WorkspaceSelectField from "@/features/workspaces/components/WorkspaceSelectField";
import TagMultiSelect from "@/features/tags/components/TagMultiSelect";
import {createSavingTarget, createTag} from "@/features/settings/db/referenceDataMutations";
import type {SavingDetailData} from "@/features/saving/db/savingDetail";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";
import SavingDirectionTabs from "@/features/saving/components/SavingDirectionTabs";

type SavingEditFormProps = {
  saving: SavingDetailData;
  options: SavingFormOptions;
};

export default function SavingEditForm({saving, options}: SavingEditFormProps) {
  const router = useRouter();
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tTags = useTranslations("tags");
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
      await updateSaving(saving.id, formData);
      exitEdit();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <SavingDirectionTabs defaultValue={saving.amount < 0 ? "withdraw" : "deposit"}/>
      <TextInputField label={t("name")} name="name" defaultValue={saving.name} isRequired/>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <CreatableSelect
          label={t("target")}
          name="targetId"
          options={options.targets}
          defaultValue={String(saving.targetId)}
          createTitle={tForms("newSavingTarget")}
          onCreate={createSavingTarget}
          isRequired
        />
        <SelectField
          label={t("frequency")}
          name="frequencyId"
          options={options.frequencies}
          defaultValue={String(saving.frequencyId)}
          isRequired
        />
        <WorkspaceSelectField workspaces={options.workspaces} defaultValue={String(saving.workspaceId)}/>
        <TextInputField label={t("amount")} name="amount" type="number" defaultValue={String(Math.abs(saving.amount))} isRequired/>
        <TextInputField label={t("startDate")} name="startDate" type="date" defaultValue={saving.startDate.slice(0, 10)} isRequired/>
        <TextInputField label={t("endDate")} name="endDate" type="date" defaultValue={saving.endDate?.slice(0, 10) ?? ""}/>
      </div>

      <TagMultiSelect
        label={tTags("label")}
        options={options.tags}
        defaultValue={saving.tags.map((tag) => String(tag.id))}
        onCreate={createTag}
      />

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={() => router.back()}>
          {tCommon("cancel")}
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? tCommon("saving") : tCommon("save")}
        </Button>
      </div>
    </form>
  );
}
