import type {ReactNode} from "react";
import StatusChip from "@/components/StatusChip";
import type {ContractDetailData} from "@/features/expense/fixed/db/contractDetail";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {year: "numeric", month: "long", day: "2-digit"});
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

// Shared, read-only view of a Contract — rendered both by the standalone [id] page and the
// intercepted-route modal, so there's one place that defines what a Contract looks like.
// The name lives in each surface's own header (modal heading / page header), not here.
export default function ContractDetail({contract}: {contract: ContractDetailData}) {
  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't). The muted
    // labels below set their own color, so only the primary content is lifted to foreground.
    <div className="flex flex-col gap-6 text-foreground">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(contract.amount)}</p>
          <p className="mt-1 text-sm text-muted">{contract.frequency}</p>
        </div>
        <StatusChip status={contract.status}/>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-default pt-5">
        <Field label="Supplier">{contract.supplier}</Field>
        <Field label="Category">{contract.category}</Field>
        <Field label="Start date">{formatDate(contract.startDate)}</Field>
        <Field label="End date">{contract.endDate ? formatDate(contract.endDate) : "—"}</Field>
        <Field label="Notice period">
          {contract.noticePeriod != null ? `${contract.noticePeriod} days` : "—"}
        </Field>
        <Field label="Document number">{contract.documentNumber ?? "—"}</Field>
      </dl>
    </div>
  );
}
