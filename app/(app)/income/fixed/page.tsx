import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import IncomeSearchField from "@/features/income/components/IncomeSearchField";
import IncomeActions from "@/features/income/components/IncomeActions";
import IncomeChartCard from "@/features/income/components/IncomeChartCard";
import IncomeUpcomingCard from "@/features/income/components/IncomeUpcomingCard";
import IncomeDataTable from "@/features/income/components/IncomeDataTable";
import IncomeEmptyState from "@/features/income/components/IncomeEmptyState";
import {getIncomeCount} from "@/features/income/db/incomeTableData";
import {parseChartOffset} from "@/features/expense/shared/db/cumulativeChart";
import {getAppSettings} from "@/features/settings/db/appSettings";

type FixedIncomePageProps = {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    categoryId?: string;
    frequencyId?: string;
    tags?: string;
    co?: string;
  }>;
};

function parseId(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

// Parses a `?tags=1,2,3` CSV param into positive ids (drops blanks/invalid). undefined → no filter.
function parseIds(value?: string): number[] | undefined {
  const ids = (value ?? "")
    .split(",")
    .map((part) => Number(part))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

export default async function FixedIncomePage({searchParams}: FixedIncomePageProps) {
  const params = await searchParams;
  const {activeWorkspaceId, upcomingWindowDays} = await getAppSettings();
  // Categorical filters feed every section (chart, upcoming, table). Status is table-only (chart +
  // upcoming are Active-by-nature).
  const filters = {
    q: params.q,
    sourceId: parseId(params.sourceId),
    categoryId: parseId(params.categoryId),
    frequencyId: parseId(params.frequencyId),
    workspaceId: activeWorkspaceId ?? undefined,
    tagIds: parseIds(params.tags),
  };

  const isEmpty = (await getIncomeCount(true)) === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        left={<VfSwitch basePath={"/income"}/>}
        center={<Suspense><IncomeSearchField/></Suspense>}
        right={<IncomeActions isRecurring={true}/>}
      />
      {isEmpty ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <IncomeEmptyState isRecurring={true}/>
        </div>
      ) : (
        // The toolbar above stays pinned; everything below (charts + table) scrolls as one region.
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex shrink-0 flex-row gap-4">
            <div className="w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <IncomeChartCard isRecurring={true} {...filters} offset={parseChartOffset(params.co)}/>
              </Suspense>
            </div>
            {/* The chart (left) sets the row height. The upcoming card overlays its own column
                (absolute) so its row count can't stretch the row — its h-full card fills the chart's
                height and scrolls internally instead of growing the page. */}
            <div className="relative w-2/5">
              <div className="absolute inset-0">
                <Suspense fallback={<Card className="h-full animate-pulse"/>}>
                  <IncomeUpcomingCard {...filters} withinDays={upcomingWindowDays}/>
                </Suspense>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Suspense>
              <IncomeDataTable isRecurring={true} activeWorkspaceId={activeWorkspaceId}/>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
