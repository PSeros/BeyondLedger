import {getTranslations} from "next-intl/server";
import StatCard from "@/components/StatCard";
import {getPeriodKpis} from "@/features/dashboard/db/dashboardKpis";
import type {Granularity} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard KPI row (Phase 12): money in / out / net for the selected period vs. the trailing
// 3-period average. Reuses StatCard. Income & net read "up is good"; expense reads "down is good".
export default async function DashboardKpis({
  workspaceId,
  granularity,
  offset,
}: {workspaceId?: number | null; granularity: Granularity; offset: number}) {
  const t = await getTranslations("dashboard");
  const {income, expense, net} = await getPeriodKpis(workspaceId, granularity, offset);

  // Three equal cards filling one bento cell (sits above the chart, left of the donuts), so the row
  // spans the chart's width regardless of the outer 6-col grid. Each card fills the row height.
  return (
    <div className="grid h-full grid-cols-3 gap-2 sm:gap-4">
      <StatCard title={t("kpiIncome")} currentAmount={income.current} previousAmount={income.previous} isHigherBetter/>
      <StatCard title={t("kpiExpenses")} currentAmount={expense.current} previousAmount={expense.previous}/>
      <StatCard title={t("kpiNet")} currentAmount={net.current} previousAmount={net.previous} isHigherBetter/>
    </div>
  );
}
