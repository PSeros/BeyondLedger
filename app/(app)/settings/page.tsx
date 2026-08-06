import ReferenceDataManager from "@/features/settings/components/ReferenceDataManager";
import {getReferenceData} from "@/features/settings/db/referenceData";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";
import {getAppSettings} from "@/features/settings/db/appSettings";

export default async function Page() {
  const [data, aiSettings, appSettings] = await Promise.all([
    getReferenceData(),
    getAiSettingsForm(),
    getAppSettings(),
  ]);
  return (
    <ReferenceDataManager
      data={data}
      aiSettings={aiSettings}
      locale={appSettings.locale}
      warrantyWarnDays={appSettings.warrantyWarnDays}
      upcomingWindowDays={appSettings.upcomingWindowDays}
    />
  );
}
