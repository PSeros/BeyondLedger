import {getTranslations} from "next-intl/server";
import StatCard from "@/components/StatCard";
import {getPeriodKpis} from "@/features/dashboard/db/dashboardKpis";
import type {Granularity} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard KPI row (Phase 12): money in / out / saved / net for the selected period vs. the trailing
// average. Reuses StatCard. Income, saved & net read "up is good"; expense reads "down is good".
export default async function DashboardKpis({
  workspaceId,
  granularity,
  offset,
}: {workspaceId?: number | null; granularity: Granularity; offset: number}) {
  const t = await getTranslations("dashboard");
  const {income, expense, saved, net} = await getPeriodKpis(workspaceId, granularity, offset);

  // Four equal cards filling one bento cell (sits above the chart, left of the donuts), so the row
  // spans the chart's width regardless of the outer 6-col grid. Each card fills the row height.
  return (
    <div className="grid h-full grid-cols-4 gap-2 sm:gap-4">
      <StatCard title={t("kpiIncome")} currentAmount={income.current} previousAmount={income.previous} isHigherBetter/>
      <StatCard title={t("kpiExpenses")} currentAmount={expense.current} previousAmount={expense.previous}/>
      <StatCard title={t("kpiSaved")} currentAmount={saved.current} previousAmount={saved.previous} isHigherBetter/>
      <StatCard title={t("kpiNet")} currentAmount={net.current} previousAmount={net.previous} isHigherBetter/>
    </div>
  );
}
