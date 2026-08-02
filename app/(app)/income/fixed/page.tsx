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

type FixedIncomePageProps = {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    categoryId?: string;
    frequencyId?: string;
  }>;
};

function parseId(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export default async function FixedIncomePage({searchParams}: FixedIncomePageProps) {
  const params = await searchParams;
  // Categorical filters feed every section (chart, upcoming, table). Status is table-only (chart +
  // upcoming are Active-by-nature).
  const filters = {
    q: params.q,
    sourceId: parseId(params.sourceId),
    categoryId: parseId(params.categoryId),
    frequencyId: parseId(params.frequencyId),
  };

  const isEmpty = (await getIncomeCount(true)) === 0;

  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/income"}/>}
        center={<Suspense><IncomeSearchField/></Suspense>}
        right={<IncomeActions isRecurring={true}/>}
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8">
        {isEmpty ? (
          <IncomeEmptyState isRecurring={true}/>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-8">
            <div className="flex shrink-0 flex-row gap-4">
              <div className="w-3/5">
                <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                  <IncomeChartCard isRecurring={true} {...filters}/>
                </Suspense>
              </div>
              <div className="w-2/5 min-h-0">
                <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                  <IncomeUpcomingCard {...filters}/>
                </Suspense>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Suspense>
                <IncomeDataTable isRecurring={true}/>
              </Suspense>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
