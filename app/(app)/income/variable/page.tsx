import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import TopKTableCard from "@/components/TopKTableCard";

export default function VariablePage() {
  return (
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
        <DataTable
          ariaLabel="Variable income"
          columns={columns}
          rows={rows}
        />
      </div>
    </div>
  );
}

// DummyData
const columns = [
  {id: "name", name: "Name", isRowHeader: true},
  {id: "source", name: "Source"},
  {id: "category", name: "Category"},
  {id: "totalAmount", name: "Total"},
  {id: "startDate", name: "Date"},
] as const;

type IncomeRow = {
  id: number;
  name: string;
  source: string;
  category: string;
  totalAmount: string;
  startDate: string;
};

const rows: IncomeRow[] = [];
