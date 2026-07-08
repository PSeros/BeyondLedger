import {Suspense} from "react";
import ChartCard from "@/components/ChartCard";
import TopKTableCard from "@/components/TopKTableCard";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import ContractTable from "@/features/expense/fixed/components/ContractTable";
import ContractSearchField from "@/features/expense/fixed/components/ContractSearchField";
import ContractActions from "@/features/expense/fixed/components/ContractActions";

export default function FixedPage() {
  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<Suspense><ContractSearchField/></Suspense>}
        right={<ContractActions/>}
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
              <ContractTable/>
            </Suspense>
          </div>
        </div>
      </div>
    </>
  );
}
