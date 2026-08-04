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

type FixedPageProps = {
  searchParams: Promise<{
    q?: string;
    supplierId?: string;
    categoryId?: string;
    frequencyId?: string;
    tags?: string;
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
  const filters = {
    q: params.q,
    supplierId: parseId(params.supplierId),
    categoryId: parseId(params.categoryId),
    frequencyId: parseId(params.frequencyId),
    tagIds: parseIds(params.tags),
  };

  const isEmpty = (await getContractCount()) === 0;

  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<Suspense><ContractSearchField/></Suspense>}
        right={<ContractActions/>}
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8">
        {isEmpty ? (
          <ExpenseEmptyState variant="fixed"/>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-8">
            <div className="flex shrink-0 flex-row gap-4">
              <div className="w-3/5">
                <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                  <ContractChartCard {...filters}/>
                </Suspense>
              </div>
              <div className="w-2/5 min-h-0">
                <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                  <ContractUpcomingCard {...filters}/>
                </Suspense>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Suspense>
                <ContractTable/>
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
