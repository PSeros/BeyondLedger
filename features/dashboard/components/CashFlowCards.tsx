import {
  getDashboardExpenseChartData,
  getDashboardIncomeChartData,
  getDashboardSavingChartData,
} from "@/features/dashboard/db/dashboardChart";
import CashFlowChart from "@/features/dashboard/components/CashFlowChart";
import type {ChartMode, Granularity} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard cash flow: fetches the income, expense and saving streams for one chart (expenses + savings
// stacked under the income line). The granularity comes from the dashboard toolbar (URL).
export default async function CashFlowCards({
  workspaceId,
  granularity,
  offset = 0,
  mode = "cumulative",
}: {workspaceId?: number | null; granularity: Granularity; offset?: number; mode?: ChartMode}) {
  const [income, expense, saving] = await Promise.all([
    getDashboardIncomeChartData(workspaceId, offset, mode),
    getDashboardExpenseChartData(workspaceId, offset, mode),
    getDashboardSavingChartData(workspaceId, offset, mode),
  ]);

  return (
    <CashFlowChart
      income={income}
      expense={expense}
      saving={saving}
      granularity={granularity}
      mode={mode}
    />
  );
}
