import {Suspense} from "react";
import ChartCard from "@/components/ChartCard";
import TopKTableCard from "@/components/TopKTableCard";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import BillTable from "@/features/expense/variable/components/BillTable";
import BillSearchField from "@/features/expense/variable/components/BillSearchField";
import BillActions from "@/features/expense/variable/components/BillActions";

export default function VariablePage() {
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
              <ChartCard/>
            </div>
            <div className="w-2/5">
              <TopKTableCard/>
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
