"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {updateContract} from "@/features/expense/fixed/db/contractMutations";
import {SelectField, TextInputField} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import SupplierSelectField from "@/features/expense/shared/components/SupplierSelectField";
import {createContractCategory} from "@/features/settings/db/referenceDataMutations";
import type {ContractDetailData} from "@/features/expense/fixed/db/contractDetail";
import type {ContractFormOptions} from "@/features/expense/fixed/db/contractFormOptions";

type ContractEditFormProps = {
  contract: ContractDetailData;
  options: ContractFormOptions;
};

export default function ContractEditForm({contract, options}: ContractEditFormProps) {
  const router = useRouter();
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
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
      await updateContract(contract.id, formData);
      exitEdit();
    } catch {
      setError(tErrors("couldNotSave"));
      setPending(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <TextInputField label={t("name")} name="name" defaultValue={contract.name} isRequired/>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SupplierSelectField
          name="supplierId"
          suppliers={options.suppliers}
          supplierCategories={options.supplierCategories}
          defaultValue={String(contract.supplierId)}
        />
        <CreatableSelect
          label={t("category")}
          name="categoryId"
          options={options.categories}
          defaultValue={String(contract.categoryId)}
          createTitle={tForms("newContractCategory")}
          onCreate={createContractCategory}
        />
        <SelectField label={t("frequency")} name="frequencyId" options={options.frequencies} defaultValue={String(contract.frequencyId)}/>
        <TextInputField label={t("amount")} name="amount" type="number" defaultValue={String(contract.amount)} isRequired/>
        <TextInputField label={t("startDate")} name="startDate" type="date" defaultValue={contract.startDate.slice(0, 10)} isRequired/>
        <TextInputField label={t("endDate")} name="endDate" type="date" defaultValue={contract.endDate?.slice(0, 10) ?? ""}/>
        <TextInputField
          label={t("noticePeriod")}
          name="noticePeriod"
          type="number"
          defaultValue={contract.noticePeriod != null ? String(contract.noticePeriod) : ""}
        />
        <TextInputField label={t("documentNumber")} name="documentNumber" defaultValue={contract.documentNumber ?? ""}/>
      </div>

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
