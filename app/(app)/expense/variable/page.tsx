import ChartCard from "@/components/ChartCard";
import TopKTableCard from "@/components/TopKTableCard";
import {getBills} from "@/features/expense/variable/db/db";
import VfSwitch from "@/components/VFSwitch";
import PageToolbar from "@/components/PageToolbar";
import BillTable from "@/features/expense/variable/components/BillTable";
import BillSearchField from "@/features/expense/variable/components/BillSearchField";
import BillActions from "@/features/expense/variable/components/BillActions";

export default async function VariablePage() {
  const bills = await getBills();

  return (
    <>
      <PageToolbar
        left={<VfSwitch basePath={"/expense"}/>}
        center={<BillSearchField/>}
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
            <BillTable bills={bills}/>
          </div>
        </div>
      </div>
    </>
  );
}
