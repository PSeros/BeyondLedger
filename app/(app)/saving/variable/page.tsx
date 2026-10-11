import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import SavingSearchField from "@/features/saving/components/SavingSearchField";
import SavingActions from "@/features/saving/components/SavingActions";
import SavingChartCard from "@/features/saving/components/SavingChartCard";
import SavingTargetsCard from "@/features/saving/components/SavingTargetsCard";
import SavingDataTable from "@/features/saving/components/SavingDataTable";
import SavingEmptyState from "@/features/saving/components/SavingEmptyState";
import {getSavingCount} from "@/features/saving/db/savingTableData";
import {parseChartMode, parseChartOffset} from "@/features/expense/shared/db/cumulativeChart";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

type VariableSavingPageProps = {
  searchParams: Promise<{
    q?: string;
    targetId?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
    co?: string;
  cm?: string;
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

export default async function VariableSavingPage({searchParams}: VariableSavingPageProps) {
  const params = await searchParams;
  const activeWorkspaceId = await getActiveWorkspaceId();
  // Categorical filters apply to every section; the date range is table-only (the table reads it).
  const categoricalFilters = {
    q: params.q,
    targetId: parseId(params.targetId),
    workspaceId: activeWorkspaceId ?? undefined,
    tagIds: parseIds(params.tags),
  };

  const isEmpty = (await getSavingCount(false)) === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        left={<VfSwitch basePath={"/saving"}/>}
        center={<Suspense><SavingSearchField/></Suspense>}
        right={<SavingActions isRecurring={false}/>}
      />
      {isEmpty ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <SavingEmptyState isRecurring={false}/>
        </div>
      ) : (
        // The toolbar above stays pinned; everything below (charts + table) scrolls as one region.
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex shrink-0 flex-col gap-4 lg:flex-row">
            <div className="w-full lg:w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <SavingChartCard isRecurring={false} {...categoricalFilters} offset={parseChartOffset(params.co)} mode={parseChartMode(params.cm)}/>
              </Suspense>
            </div>
            {/* Same overlay trick as the income upcoming card: at lg+ the chart sets the row height. */}
            <div className="relative w-full lg:w-2/5">
              <div className="h-72 lg:absolute lg:inset-0 lg:h-auto">
                <Suspense fallback={<Card className="h-full animate-pulse"/>}>
                  <SavingTargetsCard {...categoricalFilters}/>
                </Suspense>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <Suspense>
              <SavingDataTable isRecurring={false} activeWorkspaceId={activeWorkspaceId}/>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
