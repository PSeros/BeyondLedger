import {
  getDashboardExpenseChartData,
  getDashboardIncomeChartData,
} from "@/features/dashboard/db/dashboardChart";
import CashFlowChart from "@/features/dashboard/components/CashFlowChart";

// Dashboard cash-flow (Phase 12): fetches the combined income & expense streams and hands them to one
// chart that overlays both (income green, expense red) so the net gap reads at a glance.
export default async function CashFlowCards({
  workspaceId,
  offset = 0,
}: {workspaceId?: number | null; offset?: number}) {
  const [income, expense] = await Promise.all([
    getDashboardIncomeChartData(workspaceId, offset),
    getDashboardExpenseChartData(workspaceId, offset),
  ]);

  return <CashFlowChart income={income} expense={expense}/>;
}
