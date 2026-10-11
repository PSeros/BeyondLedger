import Link from "next/link";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuRepeat} from "react-icons/lu";
import Sparkline from "@/features/saving/components/Sparkline";
import {PotQuickActions, SurplusMoveButton} from "@/features/saving/components/PotActions";
import {SURPLUS_COLOR, SurplusDot} from "@/features/saving/components/SurplusPattern";
import type {Pot, Surplus} from "@/features/saving/db/savingOverview";
import type {SavingFormOptions} from "@/features/saving/db/savingFormOptions";

const LAST_MONTHS = 12;

export async function PotCard({pot, total, options}: {pot: Pot; total: number; options: SavingFormOptions}) {
  const format = await getFormatter();
  return (
    <Card className="flex flex-col gap-3 p-4">
      <Link href={`/saving/${pot.id}`} className="-m-1 flex flex-col gap-3 rounded-[var(--radius)] p-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 rounded-full" style={{background: pot.color}}/>
          <span className="truncate font-semibold">{pot.name}</span>
          <span className="ms-auto text-xs text-muted tabular-nums">
            {total > 0 ? format.number(Math.max(0, pot.balance) / total, {style: "percent", maximumFractionDigits: 0}) : null}
          </span>
        </div>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{format.number(pot.balance, "currency")}</span>
        <Sparkline values={pot.series.slice(-LAST_MONTHS)} color={pot.color}/>
        <div className="flex min-h-9 flex-col gap-0.5 text-xs text-muted">
          {pot.plans.map((plan) => (
            <span key={plan.savingId} className="flex items-center gap-1 truncate">
              <LuRepeat className="size-3 shrink-0"/>
              {format.number(plan.amount, "currency")} · {plan.frequency} · {plan.name}
            </span>
          ))}
        </div>
      </Link>
      <div className="mt-auto">
        <PotQuickActions options={options} potId={pot.id} potName={pot.name}/>
      </div>
    </Card>
  );
}

export async function SurplusCard({surplus, options}: {surplus: Surplus; options: SavingFormOptions}) {
  const [t, format] = await Promise.all([getTranslations("saving"), getFormatter()]);
  return (
    <Card className="flex flex-col gap-3 border border-dashed border-[var(--border)] bg-transparent p-4">
      <Link href="/saving/surplus" className="-m-1 flex flex-col gap-3 rounded-[var(--radius)] p-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        <div className="flex items-center gap-2">
          <SurplusDot/>
          <span className="truncate font-semibold">{t("surplus")}</span>
          <span className="ms-auto rounded-full bg-[var(--default)] px-2 py-0.5 text-[0.7rem] text-muted">{t("auto")}</span>
        </div>
        <span className={`text-2xl font-semibold tracking-tight tabular-nums ${surplus.balance < 0 ? "text-danger" : ""}`}>
          {format.number(surplus.balance, "currency")}
        </span>
        <Sparkline values={surplus.series.slice(-LAST_MONTHS)} color={SURPLUS_COLOR}/>
        <div className="min-h-9"/>
      </Link>
      <div className="mt-auto">
        <SurplusMoveButton options={options}/>
      </div>
    </Card>
  );
}
