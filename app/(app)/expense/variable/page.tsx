import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import BillTable from "@/features/expense/variable/components/BillTable";
import BillSearchField from "@/features/expense/variable/components/BillSearchField";
import BillActions from "@/features/expense/variable/components/BillActions";
import BillChartCard from "@/features/expense/variable/components/BillChartCard";
import BillTopKCard from "@/features/expense/variable/components/BillTopKCard";
import ExpenseEmptyState from "@/features/expense/shared/components/ExpenseEmptyState";
import {getBillCount} from "@/features/expense/variable/db/billTableData";
import {parseChartOffset} from "@/features/expense/shared/db/cumulativeChart";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

type VariablePageProps = {
  searchParams: Promise<{
    q?: string;
    supplierId?: string;
    supplierCategoryId?: string;
    itemCategoryId?: string;
    tags?: string;
    dateFrom?: string;
    dateTo?: string;
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

function parseIsoDate(value?: string): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function VariablePage({searchParams}: VariablePageProps) {
  const params = await searchParams;
  // The active account (Phase 14) comes from the persisted AppSettings singleton, not the URL — it's
  // a global switcher. null = "All accounts" → no filter. It applies to every section.
  const activeWorkspaceId = await getActiveWorkspaceId();
  // Categorical filters apply to every section (table, chart, top-k). The date range
  // applies to the table + top-k only — never the chart (see billChartData).
  const categoricalFilters = {
    q: params.q,
    supplierId: parseId(params.supplierId),
    supplierCategoryId: parseId(params.supplierCategoryId),
    itemCategoryId: parseId(params.itemCategoryId),
    workspaceId: activeWorkspaceId ?? undefined,
    tagIds: parseIds(params.tags),
  };
  const topKFilters = {
    ...categoricalFilters,
    dateFrom: parseIsoDate(params.dateFrom),
    dateTo: parseIsoDate(params.dateTo),
  };

  const isEmpty = (await getBillCount()) === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<Suspense><BillSearchField/></Suspense>}
        right={<BillActions/>}
      />
      {isEmpty ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <ExpenseEmptyState variant="variable"/>
        </div>
      ) : (
        // The toolbar above stays pinned; everything below (charts + table) scrolls as one region.
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex shrink-0 flex-col gap-4 lg:flex-row">
            <div className="w-full lg:w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <BillChartCard {...categoricalFilters} offset={parseChartOffset(params.co)}/>
              </Suspense>
            </div>
            <div className="w-full lg:w-2/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <BillTopKCard {...topKFilters}/>
              </Suspense>
            </div>
          </div>
          <div className="shrink-0">
            <Suspense>
              <BillTable activeWorkspaceId={activeWorkspaceId}/>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
