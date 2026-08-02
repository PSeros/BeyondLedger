import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import IncomeSearchField from "@/features/income/components/IncomeSearchField";
import IncomeActions from "@/features/income/components/IncomeActions";
import IncomeChartCard from "@/features/income/components/IncomeChartCard";
import IncomeTopKCard from "@/features/income/components/IncomeTopKCard";
import IncomeDataTable from "@/features/income/components/IncomeDataTable";

type VariableIncomePageProps = {
  searchParams: Promise<{
    q?: string;
    sourceId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

function parseId(value?: string): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIsoDate(value?: string): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function VariableIncomePage({searchParams}: VariableIncomePageProps) {
  const params = await searchParams;
  // Categorical filters apply to every section. The date range applies to the table + top-k only —
  // never the chart (see incomeChartData: it would starve the rolling-average baseline).
  const categoricalFilters = {
    q: params.q,
    sourceId: parseId(params.sourceId),
    categoryId: parseId(params.categoryId),
  };
  const topKFilters = {
    ...categoricalFilters,
    dateFrom: parseIsoDate(params.dateFrom),
    dateTo: parseIsoDate(params.dateTo),
  };

  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/income"}/>}
        center={<Suspense><IncomeSearchField/></Suspense>}
        right={<IncomeActions isRecurring={false}/>}
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8">
        <div className="flex h-full min-h-0 flex-col gap-8">
          <div className="flex shrink-0 flex-row gap-4">
            <div className="w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <IncomeChartCard isRecurring={false} {...categoricalFilters}/>
              </Suspense>
            </div>
            <div className="w-2/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <IncomeTopKCard {...topKFilters}/>
              </Suspense>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense>
              <IncomeDataTable isRecurring={false}/>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
