import Link from "next/link";
import {notFound} from "next/navigation";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuRepeat} from "react-icons/lu";
import BackLink from "@/components/BackLink";
import MovementsTable from "@/features/saving/components/MovementsTable";
import PotHistoryChart from "@/features/saving/components/PotHistoryChart";
import {PotActions} from "@/features/saving/components/PotActions";
import {getSavingOverview} from "@/features/saving/db/savingOverview";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

// One pot: its balance over time, its plans and its movements.
export default async function PotPage({params}: {params: Promise<{id: string}>}) {
  const id = Number((await params).id);
  const workspaceId = await getActiveWorkspaceId();
  const [overview, options, t, format] = await Promise.all([
    getSavingOverview(workspaceId),
    getSavingFormOptions(),
    getTranslations("saving"),
    getFormatter(),
  ]);
  const pot = overview.pots.find((p) => p.id === id);
  if (!pot) notFound();

  const mine = overview.movements.filter((m) => m.potId === pot.id);
  const paidIn = mine.filter((m) => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
  const withdrawn = mine.filter((m) => m.amount < 0).reduce((sum, m) => sum - m.amount, 0);
  const perMonth = pot.plans.reduce((sum, plan) => sum + (plan.amount * plan.frequencyValue) / 12, 0);
  const markers = mine.filter((m) => m.kind !== "plan").map((m) => ({month: m.date.slice(0, 7), amount: m.amount, name: m.name}));

  return (
    <div className="h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="flex flex-col gap-4 pb-8">
        <BackLink fallbackHref="/saving" fallbackLabel={t("backToPots")}/>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="size-3.5 rounded-full" style={{background: pot.color}}/>
            <h1 className="text-2xl font-semibold tracking-tight">{pot.name}</h1>
          </div>
          <PotActions options={options} potId={pot.id} showPlan/>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label={t("balance")} value={format.number(pot.balance, "currency")}/>
          <Stat label={t("paidInTotal")} value={format.number(paidIn, "currencyWhole")}/>
          <Stat label={t("withdrawnTotal")} value={format.number(withdrawn, "currencyWhole")}/>
          <Stat label={t("rate")} value={perMonth ? t("perMonth", {amount: format.number(perMonth, "currencyWhole")}) : "–"}/>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-4 lg:col-span-2">
            <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <Card.Title>{t("history")}</Card.Title>
              <span className="flex gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--success)]"/>{t("kindIn")}</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--danger)]"/>{t("kindOut")}</span>
              </span>
            </Card.Header>
            <PotHistoryChart months={overview.months} values={pot.series} color={pot.color} markers={markers}/>
          </Card>
          <Card className="p-4">
            <Card.Header className="pb-2"><Card.Title>{t("plans")}</Card.Title></Card.Header>
            {pot.plans.length === 0 ? (
              <p className="text-sm text-muted">{t("noPlan")}</p>
            ) : (
              <ul className="flex flex-col">
                {pot.plans.map((plan) => (
                  <li key={plan.savingId} className="border-t border-[var(--border)] first:border-t-0">
                    <Link href={`/saving/entry/${plan.savingId}`} className="flex items-center justify-between gap-3 rounded-lg py-2.5 hover:bg-[var(--default)]">
                      <span className="flex min-w-0 items-center gap-2">
                        <LuRepeat className="size-3.5 shrink-0 text-muted"/>
                        <span className="truncate">{plan.name}</span>
                      </span>
                      <span className="shrink-0 text-end text-sm tabular-nums">
                        {format.number(plan.amount, "currency")}
                        <span className="block text-xs text-muted">{plan.frequency}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="p-4">
          <Card.Header className="pb-3"><Card.Title>{t("movements")}</Card.Title></Card.Header>
          <MovementsTable movements={mine} pots={[{id: pot.id, name: pot.name, color: pot.color}]} showPot={false}/>
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
