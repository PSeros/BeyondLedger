import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import PageToolbar from "@/components/PageToolbar";
import AddSavingButton from "@/features/saving/components/AddSavingButton";
import SavingEmptyState from "@/features/saving/components/SavingEmptyState";
import SavingGrowthChart from "@/features/saving/components/SavingGrowthChart";
import MovementsTable from "@/features/saving/components/MovementsTable";
import {PotCard, SurplusCard} from "@/features/saving/components/PotCard";
import {SURPLUS_COLOR} from "@/features/saving/components/SurplusPattern";
import {getSavingOverview} from "@/features/saving/db/savingOverview";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

// Sparen: pots first. The hero shows everything set aside growing over time (pots stacked on the
// Überschuss), then one card per pot, then every movement.
export default async function SavingPage() {
  const workspaceId = await getActiveWorkspaceId();
  const [overview, options, t, format] = await Promise.all([
    getSavingOverview(workspaceId),
    getSavingFormOptions(),
    getTranslations("saving"),
    getFormatter(),
  ]);
  const {months, pots, movements, surplus} = overview;

  const n = months.length - 1;
  const totalAt = (i: number) => pots.reduce((sum, pot) => sum + (pot.series[i] ?? 0), 0) + (surplus?.series[i] ?? 0);
  const total = totalAt(n);
  const monthDelta = n > 0 ? total - totalAt(n - 1) : total;
  const plannedPerMonth = pots.flatMap((pot) => pot.plans).reduce((sum, plan) => sum + (plan.amount * plan.frequencyValue) / 12, 0);
  const yearAgo = months[Math.max(0, n - 11)] ?? "";
  const flows = movements.filter((m) => m.kind !== "opening");
  const net12 = flows.filter((m) => m.date.slice(0, 7) >= yearAgo).reduce((sum, m) => sum + m.amount, 0);
  const thisYear = months[n]?.slice(0, 4) ?? "";
  const withdrawn = flows.filter((m) => m.amount < 0 && m.date.startsWith(thisYear)).reduce((sum, m) => sum - m.amount, 0);

  const series = [
    ...(surplus ? [{key: "surplus", name: t("surplus"), color: SURPLUS_COLOR, values: surplus.series, isSurplus: true}] : []),
    ...pots.map((pot) => ({key: `p${pot.id}`, name: pot.name, color: pot.color, values: pot.series})),
  ];
  const isEmpty = pots.length === 0;
  // Closed pots keep their place in the history chart and the movements, but get no card or filter.
  const openPots = pots.filter((pot) => !pot.closed);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageToolbar
        left={null}
        center={null}
        right={<AddSavingButton options={options}/>}
      />
      {isEmpty ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <SavingEmptyState options={options}/>
        </div>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-8 [scrollbar-gutter:stable]">
          <Card className="grid shrink-0 grid-cols-1 gap-6 p-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="flex flex-col">
              <span className="text-sm text-muted">{t("total")}</span>
              <span className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{format.number(total, "currency")}</span>
              <span
                className={`mt-2 w-fit rounded-full px-2 py-0.5 text-xs tabular-nums ${monthDelta >= 0
                  ? "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-success"
                  : "bg-[color-mix(in_oklab,var(--danger)_14%,transparent)] text-danger"}`}
              >
                {monthDelta >= 0 ? "↑" : "↓"} {t("thisMonth", {amount: format.number(Math.abs(monthDelta), "currencyWhole")})}
              </span>
              <dl className="mt-5 flex flex-col text-sm">
                <Fact label={t("plansPerMonth")} value={t("perMonth", {amount: format.number(plannedPerMonth, "currencyWhole")})}/>
                <Fact label={t("net12")} value={format.number(net12, "currencyWhole")}/>
                <Fact label={t("withdrawnIn", {year: thisYear})} value={format.number(withdrawn, "currencyWhole")}/>
              </dl>
            </div>
            <SavingGrowthChart months={months} series={series}/>
          </Card>

          {/* One row: cards share the width while they fit, then the row scrolls sideways. */}
          <div className="flex shrink-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {surplus ? <SurplusCard surplus={surplus} options={options}/> : null}
            {openPots.map((pot) => <PotCard key={pot.id} pot={pot} options={options}/>)}
          </div>

          <Card className="shrink-0 p-4">
            <Card.Header className="pb-3"><Card.Title>{t("movements")}</Card.Title></Card.Header>
            <MovementsTable
              movements={movements}
              pots={pots.map(({id, name, color}) => ({id, name, color}))}
              filterPots={openPots.map((pot) => pot.id)}
              startDate={overview.analysisStart}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

function Fact({label, value}: {label: string; value: string}) {
  return (
    <div className="flex justify-between gap-3 border-t border-[var(--border)] py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
