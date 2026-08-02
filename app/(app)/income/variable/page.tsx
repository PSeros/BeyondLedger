import {Suspense} from "react";
import ChartCard from "@/components/ChartCard";
import TopKTableCard from "@/components/TopKTableCard";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import IncomeSearchField from "@/features/income/components/IncomeSearchField";
import IncomeActions from "@/features/income/components/IncomeActions";
import IncomeDataTable from "@/features/income/components/IncomeDataTable";

export default function VariableIncomePage() {
  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/income"}/>}
        center={<Suspense><IncomeSearchField/></Suspense>}
        right={<IncomeActions/>}
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
              <IncomeDataTable isRecurring={false}/>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
