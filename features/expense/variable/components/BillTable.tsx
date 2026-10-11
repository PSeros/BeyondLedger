import BillDataTable from "@/features/expense/variable/components/BillDataTable";
import {getAnalysisStart} from "@/features/settings/db/appSettings";

export default async function BillTable({activeWorkspaceId}: {activeWorkspaceId: number | null}) {
  const start = await getAnalysisStart();
  return <BillDataTable activeWorkspaceId={activeWorkspaceId} startDate={start ? start.toISOString().slice(0, 10) : null}/>;
}
