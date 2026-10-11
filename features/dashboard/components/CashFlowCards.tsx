import {
  getDashboardExpenseChartData,
  getDashboardIncomeChartData,
  getDashboardSavingChartData,
} from "@/features/dashboard/db/dashboardChart";
import CashFlowChart from "@/features/dashboard/components/CashFlowChart";
import type {ChartMode, Granularity} from "@/features/expense/shared/db/cumulativeChart";
import {getBaseline} from "@/features/settings/db/appSettings";

// Dashboard cash-flow (Phase 12): fetches the combined income, expense & saving streams and hands them to one
// chart that overlays both (income green, expense red) so the net gap reads at a glance. The active
// granularity comes from the dashboard toolbar (URL) — the chart just renders the selected unit.
export default async function CashFlowCards({
  workspaceId,
  granularity,
  offset = 0,
  mode = "cumulative",
}: {workspaceId?: number | null; granularity: Granularity; offset?: number; mode?: ChartMode}) {
  const [income, expense, saving, baseline] = await Promise.all([
    getDashboardIncomeChartData(workspaceId, offset, mode),
    getDashboardExpenseChartData(workspaceId, offset, mode),
    getDashboardSavingChartData(workspaceId, offset, mode),
    getBaseline(),
  ]);

  return (
    <CashFlowChart
      income={income}
      expense={expense}
      saving={saving}
      granularity={granularity}
      baselineMetric={baseline.metric}
      mode={mode}
    />
  );
}
