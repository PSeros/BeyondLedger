"use client";

import {useState} from "react";
import CreatableSelectField from "@/features/expense/shared/components/CreatableSelectField";
import {createSupplier, createSupplierCategory} from "@/features/settings/db/referenceDataMutations";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// The supplier picker for the Add form. Like CreatableSelectField it offers "+ Add new…", but a
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
  const [categoryId, setCategoryId] = useState("");

  return (
    <CreatableSelectField
      label="Supplier"
      name={name}
      options={suppliers}
      defaultValue={defaultValue}
      createTitle="New supplier"
      canSubmit={categoryId !== ""}
      onCreate={(supplierName) => createSupplier(supplierName, Number(categoryId))}
      extraFields={
        <CreatableSelectField
          label="Category"
          options={supplierCategories}
          createTitle="New supplier category"
          onCreate={createSupplierCategory}
          onSelect={setCategoryId}
        />
      }
    />
  );
}
