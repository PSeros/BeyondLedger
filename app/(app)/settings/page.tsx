import ReferenceDataManager from "@/features/settings/components/ReferenceDataManager";
import {getReferenceData} from "@/features/settings/db/referenceData";

export default async function Page() {
  const data = await getReferenceData();
  return <ReferenceDataManager data={data}/>;
}
