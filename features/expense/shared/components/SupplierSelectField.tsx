"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import {createSupplier, createSupplierCategory} from "@/features/settings/db/referenceDataMutations";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// The supplier picker for the Add form. Like CreatableSelect it offers "+ Add new…", but a
// new supplier also needs a SupplierCategory — so its create popover carries a nested creatable
// category picker (which can itself create a brand-new category). Save runs createSupplier(name,
// categoryId) and is disabled until a category is chosen.
export default function SupplierSelectField({
  name,
  suppliers,
  supplierCategories,
  defaultValue,
}: {
  name: string;
  suppliers: FilterOption[];
  supplierCategories: FilterOption[];
  defaultValue?: string;
}) {
  const t = useTranslations("fields");
  const tForms = useTranslations("forms");
  const [categoryId, setCategoryId] = useState("");

  return (
    <CreatableSelect
      label={t("supplier")}
      name={name}
      options={suppliers}
      defaultValue={defaultValue}
      createTitle={tForms("newSupplier")}
      canSubmit={categoryId !== ""}
      onCreate={(supplierName) => createSupplier(supplierName, Number(categoryId))}
      extraFields={
        <CreatableSelect
          label={t("category")}
          options={supplierCategories}
          createTitle={tForms("newSupplierCategory")}
          onCreate={createSupplierCategory}
          onSelect={setCategoryId}
        />
      }
    />
  );
}
