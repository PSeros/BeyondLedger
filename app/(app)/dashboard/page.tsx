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

  const cardFallback = <Card className="h-56 animate-pulse"/>;

  return (
    <div className="mt-4 h-full min-h-0 space-y-8 overflow-y-auto pb-8 [scrollbar-gutter:stable]">
      {/* Headline: warranties about to expire (full width). Renders nothing when none are due, so
          its Suspense uses a null fallback — no placeholder flash before it resolves to empty. */}
      <Suspense fallback={null}>
        <WarrantyAlertCard withinDays={warrantyWarnDays} workspaceId={activeWorkspaceId}/>
      </Suspense>

      {/* KPI row: money in / out / net, this month vs. last. */}
      <Suspense fallback={cardFallback}>
        <DashboardKpis workspaceId={activeWorkspaceId}/>
      </Suspense>

      {/* Cash-flow: income & expense trend. */}
      <Suspense fallback={cardFallback}>
        <CashFlowCards workspaceId={activeWorkspaceId} offset={chartOffset}/>
      </Suspense>

      {/* Upcoming due + budget status. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Suspense fallback={cardFallback}>
          <ContractUpcomingCard workspaceId={activeWorkspaceId ?? undefined} withinDays={upcomingWindowDays}/>
        </Suspense>
        <Suspense fallback={cardFallback}>
          <IncomeUpcomingCard workspaceId={activeWorkspaceId ?? undefined} withinDays={upcomingWindowDays}/>
        </Suspense>
        <Suspense fallback={cardFallback}>
          <BudgetStatusCard workspaceId={activeWorkspaceId}/>
        </Suspense>
      </div>
    </div>
  );
}
