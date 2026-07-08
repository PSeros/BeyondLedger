import ChartCard from "@/components/ChartCard";
import DataTable from "@/components/DataTable";
import TopKTableCard from "@/components/TopKTableCard";
import StatusChip from "@/components/StatusChip";

export default function FixedPage() {
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
          ariaLabel="Fixed income"
          columns={columns}
          rows={rows}
        />
      </div>
    </div>
  );
}

// Dummy Data
const columns = [
  {id: "name", name: "Name", isRowHeader: true},
  {id: "source", name: "Source"},
  {id: "category", name: "Category"},
  {id: "totalAmount", name: "Total"},
  {id: "frequency", name: "Frequency"},
  {id: "status", name: "Status"},
] as const;

const rows = [
  {
    id: 1,
    name: "Monthly Retainer",
    source: "Acme GmbH",
    category: "Retainer",
    totalAmount: (3000).toLocaleString("de-DE", {style: "currency", currency: "EUR"}),
    frequency: "Monthly",
    status: (<StatusChip status="Active"/>),
  },
  {
    id: 2,
    name: "Support Subscription",
    source: "Globex",
    category: "Support",
    totalAmount: (450).toLocaleString("de-DE", {style: "currency", currency: "EUR"}),
    frequency: "Monthly",
    status: (<StatusChip status="Pending"/>),
  },
  {
    id: 3,
    name: "Maintenance Agreement",
    source: "Initech",
    category: "Maintenance",
    totalAmount: (820).toLocaleString("de-DE", {style: "currency", currency: "EUR"}),
    frequency: "Monthly",
    status: (<StatusChip status="Inactive"/>),
  },
  {
    id: 4,
    name: "License Revenue",
    source: "Umbrella",
    category: "License",
    totalAmount: (119).toLocaleString("de-DE", {style: "currency", currency: "EUR"}),
    frequency: "Monthly",
    status: (<StatusChip status="Active"/>),
  },
  {
    id: 5,
    name: "Hosting Plan",
    source: "Stark Industries",
    category: "Hosting",
    totalAmount: (69).toLocaleString("de-DE", {style: "currency", currency: "EUR"}),
    frequency: "Monthly",
    status: (<StatusChip status="Pending"/>),
  },
];
