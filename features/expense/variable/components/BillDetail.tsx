import {Chip} from "@heroui/react";
import {LuShieldCheck} from "react-icons/lu";
import type {BillDetailData, BillItemDetail} from "@/features/expense/variable/db/billDetail";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {year: "numeric", month: "long", day: "2-digit"});
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

function ItemCard({item}: {item: BillItemDetail}) {
  return (
    <li className="bg-default rounded-[var(--radius)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-xs text-muted">{item.category}</p>
          {item.warranty != null ? (
            <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
              <LuShieldCheck className="size-3.5"/>
              {item.warranty} months warranty
            </span>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted tabular-nums">
            {item.quantity} × {formatCurrency(item.unitPrice)}
          </p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</p>
        </div>
      </div>
    </li>
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(bill.amount)}</p>
          <p className="mt-1 text-sm text-muted">{formatDate(bill.date)}</p>
        </div>
        <Chip variant="soft" color="accent">
          <Chip.Label>{bill.supplierCategory}</Chip.Label>
        </Chip>
      </div>

      <dl className="flex flex-col gap-4 border-t border-default pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-xs text-muted">Document number</dt>
          <dd className="text-sm tabular-nums">{bill.documentNumber ?? "—"}</dd>
        </div>
        {bill.notes ? (
          <div className="flex flex-col gap-1">
            <dt className="text-xs text-muted">Notes</dt>
            <dd className="whitespace-pre-wrap text-sm">{bill.notes}</dd>
          </div>
        ) : null}
      </dl>

      {bill.items.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-default pt-5">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            Items ({bill.items.length})
          </p>
          <ul className="flex flex-col gap-2">
            {bill.items.map((item) => (
              <ItemCard key={item.id} item={item}/>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-baseline justify-end gap-6 border-t border-default pt-4">
        <span className="text-sm text-muted">Total</span>
        <span className="text-lg font-semibold tabular-nums text-[var(--accent)]">
          {formatCurrency(bill.amount)}
        </span>
      </div>
    </div>
  );
}
