import {LuShieldCheck} from "react-icons/lu";
import EntityAttachments from "@/features/expense/shared/components/EntityAttachments";
import {deleteFileAsset, uploadBillFile} from "@/features/expense/shared/db/fileMutations";
import type {BillDetailData, BillItemDetail} from "@/features/expense/variable/db/billDetail";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {year: "numeric", month: "long", day: "2-digit"});
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

function ItemCard({item}: {item: BillItemDetail}) {
  return (
    <li className="border-default bg-surface-secondary flex items-start justify-between gap-4 rounded-[var(--radius)] border px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted">{item.category}</p>
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
    </li>
  );
}

// Shared, read-only view of a Bill — rendered both by the standalone [id] page and the
// intercepted-route modal, so there's one place that defines what a Bill looks like. Supplier +
// document number live in each surface's own header (modal / page), not here.
export default function BillDetail({bill}: {bill: BillDetailData}) {
  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't). The muted
    // labels below set their own color, so only the primary content is lifted to foreground.
    <div className="flex flex-col gap-5 text-foreground">
      <div>
        {/* The supplier-category chip now lives in each surface's header, next to the supplier. */}
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCurrency(bill.amount)}</p>
        <p className="mt-1 text-sm text-muted">{formatDate(bill.date)}</p>
      </div>

      {bill.notes ? (
        <div className="border-default bg-surface-secondary rounded-[var(--radius)] border px-3.5 py-3">
          <p className="text-xs text-muted">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{bill.notes}</p>
        </div>
      ) : null}

      {bill.items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
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

      <div className="flex items-center justify-between rounded-[var(--radius)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 py-3">
        <span className="text-sm font-medium">Total</span>
        <span className="text-lg font-semibold tabular-nums text-[var(--accent)]">
          {formatCurrency(bill.amount)}
        </span>
      </div>

      <EntityAttachments
        files={bill.files}
        uploadAction={uploadBillFile.bind(null, bill.id)}
        deleteAction={deleteFileAsset}
      />
    </div>
  );
}
