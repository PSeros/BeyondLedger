import Link from "next/link";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import BackLink from "@/components/BackLink";
import DataTable from "@/components/DataTable";
import PotHistoryChart from "@/features/saving/components/PotHistoryChart";
import {SurplusMoveButton} from "@/features/saving/components/PotActions";
import {SURPLUS_COLOR, SurplusDot} from "@/features/saving/components/SurplusPattern";
import {getSavingOverview} from "@/features/saving/db/savingOverview";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

// The Überschuss: income − expenses − saved, month by month from the app-wide start date.
export default async function SurplusPage() {
  const workspaceId = await getActiveWorkspaceId();
  const [overview, options, t, format] = await Promise.all([
    getSavingOverview(workspaceId),
    getSavingFormOptions(),
    getTranslations("saving"),
    getFormatter(),
  ]);
  const {surplus, months} = overview;
  const from = surplus ? Math.max(0, months.indexOf(surplus.start.slice(0, 7))) : 0;
  const lefts = surplus?.months.map((m) => m.left) ?? [];
  const money = (value: number) => format.number(value, "currencyWhole");

  const rows = (surplus?.months ?? []).map((m) => ({
    id: m.month,
    month: (
      <span className="flex items-center gap-2">
        {format.dateTime(new Date(`${m.month}-01T00:00:00Z`), {month: "long", year: "numeric", timeZone: "UTC"})}
        {m.isCurrent ? <span className="rounded-full bg-[var(--default)] px-2 py-0.5 text-xs text-muted">{t("soFar")}</span> : null}
      </span>
    ),
    income: <span className="tabular-nums">{money(m.income)}</span>,
    expense: <span className="tabular-nums">{money(m.expense)}</span>,
    saved: <span className="tabular-nums">{money(m.saved)}</span>,
    left: <span className={`tabular-nums ${m.left < 0 ? "text-danger" : ""}`}>{m.left > 0 ? "+" : ""}{money(m.left)}</span>,
  }));

  return (
    <div className="h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="flex flex-col gap-4 pb-8">
        <BackLink fallbackHref="/saving" fallbackLabel={t("backToPots")}/>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <SurplusDot className="size-3.5"/>
            <h1 className="text-2xl font-semibold tracking-tight">{t("surplus")}</h1>
            <span className="rounded-full bg-[var(--default)] px-2 py-0.5 text-xs text-muted">{t("auto")}</span>
          </div>
          <SurplusMoveButton options={options}/>
        </div>
        {surplus ? (
          <p className="text-sm text-muted">
            {t("surplusFormula", {date: format.dateTime(new Date(`${surplus.start}T00:00:00Z`), {dateStyle: "medium", timeZone: "UTC"})})}
            {" · "}
            <Link href="/settings/general#start" className="text-[var(--accent)] hover:underline">{t("changeStart")}</Link>
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t("balance")} value={format.number(surplus?.balance ?? 0, "currency")}/>
          <Stat label={t("avgMonth")} value={lefts.length ? money(lefts.reduce((a, b) => a + b, 0) / lefts.length) : "–"}/>
          <Stat label={t("bestMonth")} value={lefts.length ? money(Math.max(...lefts)) : "–"}/>
          <Stat label={t("worstMonth")} value={lefts.length ? money(Math.min(...lefts)) : "–"}/>
        </div>

        <Card className="p-4">
          <Card.Header className="pb-2"><Card.Title>{t("history")}</Card.Title></Card.Header>
          <PotHistoryChart months={months.slice(from)} values={surplus?.series.slice(from) ?? []} color={SURPLUS_COLOR} hatched/>
        </Card>

        <Card className="p-4">
          <Card.Header className="pb-3"><Card.Title>{t("monthsTitle")}</Card.Title></Card.Header>
          <DataTable
            ariaLabel={t("monthsTitle")}
            scroll="page"
            columns={[
              {id: "month", name: t("month"), isRowHeader: true, allowsSorting: false},
              {id: "income", name: t("colIncome"), allowsSorting: false},
              {id: "expense", name: t("colExpense"), allowsSorting: false},
              {id: "saved", name: t("colSaved"), allowsSorting: false},
              {id: "left", name: t("colLeft"), allowsSorting: false},
            ]}
            rows={rows}
          />
        </Card>
      </div>
    </div>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <Card className="p-4">
      <span className="text-xs text-muted">{label}</span>
      <span className="mt-1 text-xl font-semibold tabular-nums">{value}</span>
    </Card>
  );
}
