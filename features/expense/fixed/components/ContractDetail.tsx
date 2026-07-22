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
      <dt className="text-foreground-500 text-xs">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

// Shared, read-only view of a Contract — rendered both by the standalone [id] page and the
// intercepted-route modal, so there's one place that defines what a Contract looks like.
export default function ContractDetail({contract}: {contract: ContractDetailData}) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
      <Field label="Status"><StatusChip status={contract.status}/></Field>
      <Field label="Amount">{formatCurrency(contract.amount)} · {contract.frequency}</Field>
      <Field label="Supplier">{contract.supplier}</Field>
      <Field label="Category">{contract.category}</Field>
      <Field label="Start date">{formatDate(contract.startDate)}</Field>
      <Field label="End date">{contract.endDate ? formatDate(contract.endDate) : "—"}</Field>
      <Field label="Notice period">
        {contract.noticePeriod != null ? `${contract.noticePeriod} days` : "—"}
      </Field>
      <Field label="Document number">{contract.documentNumber ?? "—"}</Field>
    </dl>
  );
}
