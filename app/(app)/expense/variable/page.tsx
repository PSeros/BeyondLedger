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
  searchParams: Promise<{q?: string}>;
};

export default async function VariablePage({searchParams}: VariablePageProps) {
  const {q} = await searchParams;

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
                <BillChartCard q={q}/>
              </Suspense>
            </div>
            <div className="w-2/5">
              <Suspense fallback={<Card className="h-56 animate-pulse"/>}>
                <BillTopKCard q={q}/>
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
