import {
  getDashboardExpenseChartData,
  getDashboardIncomeChartData,
} from "@/features/dashboard/db/dashboardChart";
import CashFlowChart from "@/features/dashboard/components/CashFlowChart";
import type {Granularity} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard cash-flow (Phase 12): fetches the combined income & expense streams and hands them to one
// chart that overlays both (income green, expense red) so the net gap reads at a glance. The active
// granularity comes from the dashboard toolbar (URL) — the chart just renders the selected unit.
export default async function CashFlowCards({
  workspaceId,
  granularity,
  offset = 0,
}: {workspaceId?: number | null; granularity: Granularity; offset?: number}) {
  const [income, expense] = await Promise.all([
    getDashboardIncomeChartData(workspaceId, offset),
    getDashboardExpenseChartData(workspaceId, offset),
  ]);

  return <CashFlowChart income={income} expense={expense} granularity={granularity}/>;
}
