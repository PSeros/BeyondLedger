import {getTranslations} from "next-intl/server";
import {getLookupReferenceData} from "@/features/settings/db/referenceData";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import CategoryLists from "@/features/settings/components/reference/CategoryLists";
import FrequencySection from "@/features/settings/components/reference/FrequencySection";
import SupplierSection from "@/features/settings/components/reference/SupplierSection";

// The lookup tables every expense and income entry draws from.
export default async function Page() {
  const [t, data] = await Promise.all([getTranslations("settings"), getLookupReferenceData()]);

  return (
    <SettingsSection heading={t("refDataHeading")} description={t("refDataDescription")}>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2">
          <SupplierSection id="suppliers" suppliers={data.suppliers} categories={data.supplierCategories}/>
        </div>
        <FrequencySection id="frequencies" frequencies={data.frequencies}/>
        <CategoryLists
          supplierCategories={data.supplierCategories}
          itemCategories={data.itemCategories}
          contractCategories={data.contractCategories}
          incomeSources={data.incomeSources}
          incomeCategories={data.incomeCategories}
        />
      </div>
    </SettingsSection>
  );
}
