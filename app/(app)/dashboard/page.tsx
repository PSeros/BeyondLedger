import {Suspense} from "react";
import {Card} from "@heroui/react";
import {getActiveWorkspaceId, getAppSettings} from "@/features/settings/db/appSettings";
import {getBillCount} from "@/features/expense/variable/db/billTableData";
import {getContractCount} from "@/features/expense/fixed/db/contractTableData";
import {getIncomeCount} from "@/features/income/db/incomeTableData";
import {getBudgetCount} from "@/features/budget/db/budgets";
import WarrantyAlertCard from "@/features/dashboard/components/WarrantyAlertCard";
import DashboardKpis from "@/features/dashboard/components/DashboardKpis";
import CashFlowCards from "@/features/dashboard/components/CashFlowCards";
import DashboardCategoryDonut from "@/features/dashboard/components/DashboardCategoryDonut";
import DashboardContractDonut from "@/features/dashboard/components/DashboardContractDonut";
import BudgetStatusCard from "@/features/dashboard/components/BudgetStatusCard";
import DashboardEmptyState from "@/features/dashboard/components/DashboardEmptyState";
import ContractUpcomingCard from "@/features/expense/fixed/components/ContractUpcomingCard";
import IncomeUpcomingCard from "@/features/income/components/IncomeUpcomingCard";
import {parseChartOffset} from "@/features/expense/shared/db/cumulativeChart";

// The dashboard is a live view of DB state (active account, counts, budgets, projected occurrences)
// with no searchParams to make it dynamic on its own — without this it would be prerendered once at
// build and freeze. Render fresh per request so it always reflects the current data + settings.
export const dynamic = "force-dynamic";

// The Dashboard (Phase 12): an at-a-glance financial overview honoring the active account. Each
// widget fetches its own data inside its own Suspense boundary so a slow section never blocks the
// rest. The active-account + reminder-window settings come from the AppSettings singleton, not the
// URL. Topbar auto-titles the route, so this page renders only content.
export default async function DashboardPage({searchParams}: {searchParams: Promise<{co?: string}>}) {
  const [{co}, activeWorkspaceId, {warrantyWarnDays, upcomingWindowDays}] = await Promise.all([
    searchParams,
    getActiveWorkspaceId(),
    getAppSettings(),
  ]);
  const chartOffset = parseChartOffset(co);

  const [billCount, contractCount, fixedIncomeCount, variableIncomeCount, budgetCount] = await Promise.all([
    getBillCount(),
    getContractCount(),
    getIncomeCount(true),
    getIncomeCount(false),
    getBudgetCount(),
  ]);
  const isEmpty =
    billCount + contractCount + fixedIncomeCount + variableIncomeCount + budgetCount === 0;

  if (isEmpty) {
    return (
      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <DashboardEmptyState/>
      </div>
    );
  }

  const tileFallback = <Card className="h-full animate-pulse"/>;

  return (
    <div className="mt-4 h-full min-h-0 space-y-4 overflow-y-auto pb-8 [scrollbar-gutter:stable]">
      {/* Headline banner: warranties about to expire. Renders nothing when none are due (null
          fallback → no flash); wrapped in an auto-height div so its h-full card sizes to content. */}
      <div>
        <Suspense fallback={null}>
          <WarrantyAlertCard withinDays={warrantyWarnDays} workspaceId={activeWorkspaceId}/>
        </Suspense>
      </div>

      {/*
        Bento: a fixed row grid (auto-rows) with cards that fill their cell (h-full), so tiles get
        their varied, aligned sizes. Auto-placement (dense) lays the DOM order out as:
          • row 1 — three KPI tiles
          • the cash-flow chart as a tall hero (cols 1–4, 4 rows) with the two composition donuts
            stacked beside it (cols 5–6, 2 rows each)
          • a footer of the two upcoming lists + budget status (three 2-col tiles)
        On < lg it folds to a 2-column bento.
      */}
      <div className="grid grid-flow-row-dense auto-rows-[7.5rem] grid-cols-2 gap-4 lg:grid-cols-6">
        {/* KPI strip: money in / out / net, this month vs. last (renders three grid cells). */}
        <Suspense fallback={<div className="col-span-2 lg:col-span-6">{tileFallback}</div>}>
          <DashboardKpis workspaceId={activeWorkspaceId}/>
        </Suspense>

        {/* Hero: income & expense trend. */}
        <div className="col-span-2 row-span-3 lg:col-span-4 lg:row-span-4">
          <Suspense fallback={tileFallback}>
            <CashFlowCards workspaceId={activeWorkspaceId} offset={chartOffset}/>
          </Suspense>
        </div>

        {/* Composition donuts, stacked beside the hero: variable spend + monthly fixed costs. */}
        <div className="col-span-1 row-span-2 lg:col-span-2 lg:row-span-2">
          <Suspense fallback={tileFallback}>
            <DashboardCategoryDonut workspaceId={activeWorkspaceId}/>
          </Suspense>
        </div>
        <div className="col-span-1 row-span-2 lg:col-span-2 lg:row-span-2">
          <Suspense fallback={tileFallback}>
            <DashboardContractDonut workspaceId={activeWorkspaceId}/>
          </Suspense>
        </div>

        {/* Footer: upcoming due + budget status. */}
        <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-3">
          <Suspense fallback={tileFallback}>
            <ContractUpcomingCard workspaceId={activeWorkspaceId ?? undefined} withinDays={upcomingWindowDays}/>
          </Suspense>
        </div>
        <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-3">
          <Suspense fallback={tileFallback}>
            <IncomeUpcomingCard workspaceId={activeWorkspaceId ?? undefined} withinDays={upcomingWindowDays}/>
          </Suspense>
        </div>
        <div className="col-span-2 row-span-3 lg:col-span-2 lg:row-span-3">
          <Suspense fallback={tileFallback}>
            <BudgetStatusCard workspaceId={activeWorkspaceId}/>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
