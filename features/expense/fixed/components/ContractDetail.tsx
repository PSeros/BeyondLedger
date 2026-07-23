import type {ReactNode} from "react";
import StatusChip from "@/components/StatusChip";
import type {ContractDetailData} from "@/features/expense/fixed/db/contractDetail";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {year: "numeric", month: "long", day: "2-digit"});
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

// A single label/value line. Hairline rows (border-t between) read lighter than a boxed grid.
function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="border-default flex items-center justify-between gap-4 border-t py-2.5 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}

// Shared, read-only view of a Contract — rendered both by the standalone [id] page and the
// intercepted-route modal. Name + supplier/category live in each surface's own header, not here.
export default function ContractDetail({contract}: {contract: ContractDetailData}) {
  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't).
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(contract.amount)}</p>
          <p className="mt-1 text-sm text-muted">{contract.frequency}</p>
        </div>
        <StatusChip status={contract.status}/>
      </div>

      <dl className="flex flex-col">
        <Row label="Start date">{formatDate(contract.startDate)}</Row>
        <Row label="End date">{contract.endDate ? formatDate(contract.endDate) : "—"}</Row>
        <Row label="Notice period">
          {contract.noticePeriod != null ? `${contract.noticePeriod} days` : "—"}
        </Row>
        <Row label="Document number">{contract.documentNumber ?? "—"}</Row>
      </dl>
    </div>
  );
}
