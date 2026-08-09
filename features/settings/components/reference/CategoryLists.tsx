"use client";

import {useTranslations} from "next-intl";
import type {CategoryRow} from "@/features/settings/db/referenceData";
import NameSection from "@/features/settings/components/reference/NameSection";
import {
  createContractCategory,
  createIncomeCategory,
  createIncomeSource,
  createItemCategory,
  createSupplierCategory,
  deleteContractCategory,
  deleteIncomeCategory,
  deleteIncomeSource,
  deleteItemCategory,
  deleteSupplierCategory,
  renameContractCategory,
  renameIncomeCategory,
  renameIncomeSource,
  renameItemCategory,
  renameSupplierCategory,
} from "@/features/settings/db/referenceDataMutations";

// The five name-only lookup lists. They share NameSection and differ only in title + actions, so
// the wiring lives here in one client component rather than being repeated on the page.
export default function CategoryLists({
  supplierCategories,
  itemCategories,
  contractCategories,
  incomeSources,
  incomeCategories,
}: {
  supplierCategories: CategoryRow[];
  itemCategories: CategoryRow[];
  contractCategories: CategoryRow[];
  incomeSources: CategoryRow[];
  incomeCategories: CategoryRow[];
}) {
  const t = useTranslations("settings");
  return (
    <>
      <NameSection
        id="supplier-categories"
        title={t("supplierCategories")}
        rows={supplierCategories}
        create={createSupplierCategory}
        rename={renameSupplierCategory}
        remove={deleteSupplierCategory}
      />
      <NameSection
        id="item-categories"
        title={t("itemCategories")}
        rows={itemCategories}
        create={createItemCategory}
        rename={renameItemCategory}
        remove={deleteItemCategory}
      />
      <NameSection
        id="contract-categories"
        title={t("contractCategories")}
        rows={contractCategories}
        create={createContractCategory}
        rename={renameContractCategory}
        remove={deleteContractCategory}
      />
      <NameSection
        id="income-sources"
        title={t("incomeSources")}
        rows={incomeSources}
        create={createIncomeSource}
        rename={renameIncomeSource}
        remove={deleteIncomeSource}
      />
      <NameSection
        id="income-categories"
        title={t("incomeCategories")}
        rows={incomeCategories}
        create={createIncomeCategory}
        rename={renameIncomeCategory}
        remove={deleteIncomeCategory}
      />
    </>
  );
}
