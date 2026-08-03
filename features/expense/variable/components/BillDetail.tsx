import {getFormatter, getTranslations} from "next-intl/server";
import {LuShieldCheck} from "react-icons/lu";
import EntityAttachments from "@/features/expense/shared/components/EntityAttachments";
import {deleteFileAsset, uploadBillFile} from "@/features/expense/shared/db/fileMutations";
import type {BillDetailData, BillItemDetail} from "@/features/expense/variable/db/billDetail";

type Formatter = Awaited<ReturnType<typeof getFormatter>>;
type Translator = Awaited<ReturnType<typeof getTranslations>>;

function ItemCard({item, format, t}: {item: BillItemDetail; format: Formatter; t: Translator}) {
  return (
    <li className="border-default bg-surface-secondary flex items-start justify-between gap-4 rounded-[var(--radius)] border px-3.5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted">{item.category}</p>
        {item.warranty != null ? (
          <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted">
            <LuShieldCheck className="size-3.5"/>
            {t("fields.monthsWarranty", {count: item.warranty})}
          </span>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-muted tabular-nums">
          {item.quantity} × {format.number(item.unitPrice, "currency")}
        </p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{format.number(item.totalPrice, "currency")}</p>
      </div>
    </li>
  );
}

// Shared, read-only view of a Bill — rendered both by the standalone [id] page and the
// intercepted-route modal, so there's one place that defines what a Bill looks like. Supplier +
// document number live in each surface's own header (modal / page), not here.
export default async function BillDetail({bill}: {bill: BillDetailData}) {
  const t = await getTranslations();
  const format = await getFormatter();

  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't). The muted
    // labels below set their own color, so only the primary content is lifted to foreground.
    <div className="flex flex-col gap-5 text-foreground">
      <div>
        {/* The supplier-category chip now lives in each surface's header, next to the supplier. */}
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(bill.amount, "currency")}</p>
        <p className="mt-1 text-sm text-muted">{format.dateTime(new Date(bill.date), "long")}</p>
      </div>

      {bill.notes ? (
        <div className="border-default bg-surface-secondary rounded-[var(--radius)] border px-3.5 py-3">
          <p className="text-xs text-muted">{t("fields.notes")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{bill.notes}</p>
        </div>
      ) : null}

      {bill.items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("forms.items", {count: bill.items.length})}
          </p>
          <ul className="flex flex-col gap-2">
            {bill.items.map((item) => (
              <ItemCard key={item.id} item={item} format={format} t={t}/>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-between rounded-[var(--radius)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 py-3">
        <span className="text-sm font-medium">{t("fields.total")}</span>
        <span className="text-lg font-semibold tabular-nums text-[var(--accent)]">
          {format.number(bill.amount, "currency")}
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
