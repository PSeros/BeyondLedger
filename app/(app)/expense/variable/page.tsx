import {Suspense} from "react";
import {Card} from "@heroui/react";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import BillTable from "@/features/expense/variable/components/BillTable";
import BillSearchField from "@/features/expense/variable/components/BillSearchField";
import BillActions from "@/features/expense/variable/components/BillActions";
import BillChartCard from "@/features/expense/variable/components/BillChartCard";
import BillTopKCard from "@/features/expense/variable/components/BillTopKCard";

type VariablePageProps = {
  searchParams: Promise<{
    q?: string;
    supplierId?: string;
    supplierCategoryId?: string;
    itemCategoryId?: string;
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

export default async function VariablePage({searchParams}: VariablePageProps) {
  const params = await searchParams;
  // Categorical filters apply to every section (table, chart, top-k). The date range
  // applies to the table + top-k only — never the chart (see billChartData).
  const categoricalFilters = {
    q: params.q,
    supplierId: parseId(params.supplierId),
    supplierCategoryId: parseId(params.supplierCategoryId),
    itemCategoryId: parseId(params.itemCategoryId),
  };
  const topKFilters = {
    ...categoricalFilters,
    dateFrom: parseIsoDate(params.dateFrom),
    dateTo: parseIsoDate(params.dateTo),
  };

  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<Suspense><BillSearchField/></Suspense>}
        right={<BillActions/>}
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-8">
        <div className="flex h-full min-h-0 flex-col gap-8">
          <div className="flex shrink-0 flex-row gap-4">
            <div className="w-3/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <BillChartCard {...categoricalFilters}/>
              </Suspense>
            </div>
            <div className="w-2/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <BillTopKCard {...topKFilters}/>
              </Suspense>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Suspense>
              <BillTable/>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
