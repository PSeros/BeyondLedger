import type {ReactNode} from "react";
import type {BillDetailData} from "@/features/expense/variable/db/billDetail";

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

// Shared, read-only view of a Bill — rendered both by the standalone [id] page and the
// intercepted-route modal, so there's one place that defines what a Bill looks like. The
// supplier lives in each surface's own header (modal heading / page header), not here.
export default function BillDetail({bill}: {bill: BillDetailData}) {
  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't). The muted
    // labels below set their own color, so only the primary content is lifted to foreground.
    <div className="flex flex-col gap-6 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight">{formatCurrency(bill.amount)}</p>
          <p className="text-sm text-muted">{formatDate(bill.date)}</p>
        </div>
        <span className="text-sm text-muted">{bill.supplierCategory}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-default pt-5">
        <Field label="Supplier">{bill.supplier}</Field>
        <Field label="Category">{bill.supplierCategory}</Field>
        <Field label="Date">{formatDate(bill.date)}</Field>
        <Field label="Document number">{bill.documentNumber ?? "—"}</Field>
        {bill.notes ? (
          <div className="col-span-2">
            <Field label="Notes">
              <p className="whitespace-pre-wrap">{bill.notes}</p>
            </Field>
          </div>
        ) : null}
      </dl>

      {bill.items.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-default pt-5">
          <p className="text-xs text-muted">Items ({bill.items.length})</p>
          <ul className="flex flex-col divide-y divide-default">
            {bill.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.name}</p>
                  <p className="text-xs text-muted">
                    {item.category} · {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <span className="shrink-0 text-sm tabular-nums">{formatCurrency(item.totalPrice)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
