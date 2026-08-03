import type {ReactNode} from "react";
import {getFormatter, getTranslations} from "next-intl/server";
import StatusChip from "@/components/StatusChip";
import type {IncomeDetailData} from "@/features/income/db/incomeDetail";

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
export default async function IncomeDetail({income}: {income: IncomeDetailData}) {
  const t = await getTranslations("fields");
  const format = await getFormatter();

  return (
    // text-foreground anchors the default color: HeroUI's Modal.Body forces text-muted, which
    // would gray out the values (the standalone Card doesn't).
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(income.amount, "currency")}</p>
          <p className="mt-1 text-sm text-muted">{income.frequency}</p>
        </div>
        <StatusChip status={income.status}/>
      </div>

      <dl className="flex flex-col">
        <Row label={income.isRecurring ? t("startDate") : t("date")}>{format.dateTime(new Date(income.startDate), "long")}</Row>
        {income.isRecurring ? (
          <Row label={t("endDate")}>{income.endDate ? format.dateTime(new Date(income.endDate), "long") : "—"}</Row>
        ) : null}
      </dl>
    </div>
  );
}
