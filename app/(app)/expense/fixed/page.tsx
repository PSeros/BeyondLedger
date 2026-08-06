import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import ContractTable from "@/features/expense/fixed/components/ContractTable";
import ContractSearchField from "@/features/expense/fixed/components/ContractSearchField";
import ContractActions from "@/features/expense/fixed/components/ContractActions";
import ContractChartCard from "@/features/expense/fixed/components/ContractChartCard";
import ContractUpcomingCard from "@/features/expense/fixed/components/ContractUpcomingCard";
import ExpenseEmptyState from "@/features/expense/shared/components/ExpenseEmptyState";
import {getContractCount} from "@/features/expense/fixed/db/contractTableData";
import {parseChartOffset} from "@/features/expense/shared/db/cumulativeChart";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

type FixedPageProps = {
  searchParams: Promise<{
    q?: string;
    supplierId?: string;
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

export default async function FixedPage({searchParams}: FixedPageProps) {
  const params = await searchParams;
  const activeWorkspaceId = await getActiveWorkspaceId();
  const filters = {
    q: params.q,
    supplierId: parseId(params.supplierId),
    categoryId: parseId(params.categoryId),
    frequencyId: parseId(params.frequencyId),
    workspaceId: activeWorkspaceId ?? undefined,
    tagIds: parseIds(params.tags),
  };

  const isEmpty = (await getContractCount()) === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<Suspense><ContractSearchField/></Suspense>}
        right={<ContractActions/>}
      />
      {isEmpty ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <ExpenseEmptyState variant="fixed"/>
        </div>
      ) : (
        // The toolbar above stays pinned; everything below (charts + table) scrolls as one region.
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="flex shrink-0 flex-row gap-4">
            <div className="w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <ContractChartCard {...filters} offset={parseChartOffset(params.co)}/>
              </Suspense>
            </div>
            <div className="w-2/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <ContractUpcomingCard {...filters}/>
              </Suspense>
            </div>
          </div>
          <div className="shrink-0">
            <Suspense>
              <ContractTable activeWorkspaceId={activeWorkspaceId}/>
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
