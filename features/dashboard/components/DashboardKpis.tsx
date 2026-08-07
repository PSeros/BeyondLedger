import {getTranslations} from "next-intl/server";
import StatCard from "@/components/StatCard";
import {getMonthlyKpis} from "@/features/dashboard/db/dashboardKpis";

// Dashboard KPI row (Phase 12): money in / out / net for the current calendar month vs. the previous
// one. Reuses StatCard (its first use). Income & net read "up is good"; expense reads "down is good".
export default async function DashboardKpis({workspaceId}: {workspaceId?: number | null}) {
  const t = await getTranslations("dashboard");
  const {income, expense, net} = await getMonthlyKpis(workspaceId);

  // Three bento tiles (grid cells) — the parent dashboard grid lays them out. Each fills its cell.
  return (
    <>
      <div className="col-span-2 lg:col-span-2">
        <StatCard title={t("kpiIncome")} currentAmount={income.current} previousAmount={income.previous} isHigherBetter/>
      </div>
      <div className="col-span-2 lg:col-span-2">
        <StatCard title={t("kpiExpenses")} currentAmount={expense.current} previousAmount={expense.previous}/>
      </div>
      <div className="col-span-2 lg:col-span-2">
        <StatCard title={t("kpiNet")} currentAmount={net.current} previousAmount={net.previous} isHigherBetter/>
      </div>
    </>
  );
}
