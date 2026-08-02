import ReferenceDataManager from "@/features/settings/components/ReferenceDataManager";
import {getReferenceData} from "@/features/settings/db/referenceData";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";

export default async function Page() {
  const [data, aiSettings] = await Promise.all([getReferenceData(), getAiSettingsForm()]);
  return <ReferenceDataManager data={data} aiSettings={aiSettings}/>;
}
