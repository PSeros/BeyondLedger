import ReferenceDataManager from "@/features/settings/components/ReferenceDataManager";
import {getReferenceData} from "@/features/settings/db/referenceData";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";
import {getLocale} from "@/features/settings/db/appSettings";

export default async function Page() {
  const [data, aiSettings, locale] = await Promise.all([
    getReferenceData(),
    getAiSettingsForm(),
    getLocale(),
  ]);
  return <ReferenceDataManager data={data} aiSettings={aiSettings} locale={locale}/>;
}
