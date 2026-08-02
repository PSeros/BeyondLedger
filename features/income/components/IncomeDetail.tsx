import type {ReactNode} from "react";
import StatusChip from "@/components/StatusChip";
import type {IncomeDetailData} from "@/features/income/db/incomeDetail";

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

// Shared, read-only view of an Income — rendered both by the standalone [id] page and the
// intercepted-route modal, for both tabs. Name + source/category live in each surface's header.
export default function IncomeDetail({income}: {income: IncomeDetailData}) {
  return (
    // text-foreground anchors the default color: HeroUI's Modal.Body forces text-muted, which
    // would gray out the values (the standalone Card doesn't).
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(income.amount)}</p>
          <p className="mt-1 text-sm text-muted">{income.frequency}</p>
        </div>
        <StatusChip status={income.status}/>
      </div>

      <dl className="flex flex-col">
        <Row label={income.isRecurring ? "Start date" : "Date"}>{formatDate(income.startDate)}</Row>
        {income.isRecurring ? (
          <Row label="End date">{income.endDate ? formatDate(income.endDate) : "—"}</Row>
        ) : null}
      </dl>
    </div>
  );
}
