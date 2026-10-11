"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis} from "recharts";
import {STACK_TINT} from "@/components/chartTints";
import {SURPLUS_COLOR, SURPLUS_PATTERN_ID, SurplusDot, SurplusPatternDef} from "@/features/saving/components/SurplusPattern";

export type GrowthSeries = {key: string; name: string; color: string; values: number[]; isSurplus?: boolean};

// The pots growing over time, stacked (Überschuss at the bottom, hatched). A band can't go below zero
// in a stack, so a negative Überschuss is drawn as 0 here; the tooltip shows the real values.
export default function SavingGrowthChart({months, series}: {months: string[]; series: GrowthSeries[]}) {
  const t = useTranslations("saving");
  const format = useFormatter();
  const [range, setRange] = useState<"12" | "all">("12");
  const from = range === "12" ? Math.max(0, months.length - 12) : 0;

  const data = months.slice(from).map((month, i) => ({
    month,
    ...Object.fromEntries(series.map((s) => [s.key, Math.max(0, s.values[from + i] ?? 0)])),
    ...Object.fromEntries(series.map((s) => [`${s.key}Real`, s.values[from + i] ?? 0])),
  }));
  const label = (month: string) => format.dateTime(new Date(`${month}-01T00:00:00Z`), {month: "short", year: "2-digit", timeZone: "UTC"});

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              {s.isSurplus ? <SurplusDot/> : <span className="size-2.5 rounded-full" style={{background: s.color}}/>}
              {s.name}
            </span>
          ))}
        </div>
        <div className="flex rounded-full bg-[var(--default)] p-0.5 text-sm" role="group" aria-label={t("range")}>
          {(["12", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-full px-3 py-1 ${range === key ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm" : "text-muted"}`}
            >
              {key === "12" ? t("range12") : t("rangeAll")}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[13rem] flex-1">
        <AreaChart data={data} margin={{top: 8, right: 8, left: 0, bottom: 0}} width="100%" height="100%">
          <defs><SurplusPatternDef/></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6}/>
          <XAxis dataKey="month" tickFormatter={label} axisLine={false} tickLine={false} tickMargin={8} interval="preserveStartEnd" tick={{fontSize: "0.75rem", fill: "var(--muted)"}}/>
          <YAxis axisLine={false} tickLine={false} tickMargin={8} tickFormatter={(v) => format.number(Number(v), "integer")} tick={{fontSize: "0.75rem", fill: "var(--muted)"}}/>
          <Tooltip
            cursor={{stroke: "var(--muted)", strokeDasharray: "3 3"}}
            content={({active, payload, label: month}) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as Record<string, number>;
              const total = series.reduce((sum, s) => sum + (row[`${s.key}Real`] ?? 0), 0);
              return (
                <div className="min-w-44 rounded-[var(--radius)] border border-[var(--default)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 font-semibold">{format.dateTime(new Date(`${month}-01T00:00:00Z`), {month: "long", year: "numeric", timeZone: "UTC"})}</p>
                  {[...series].reverse().map((s) => (
                    <p key={s.key} className="flex justify-between gap-4">
                      <span className="flex items-center gap-1.5">
                        {s.isSurplus ? <SurplusDot className="size-2"/> : <span className="size-2 rounded-full" style={{background: s.color}}/>}
                        {s.name}
                      </span>
                      <span className="tabular-nums">{format.number(row[`${s.key}Real`] ?? 0, "currencyWhole")}</span>
                    </p>
                  ))}
                  <p className="mt-1 flex justify-between gap-4 border-t border-[var(--default)] pt-1">
                    <span>{t("total")}</span>
                    <span className="tabular-nums">{format.number(total, "currencyWhole")}</span>
                  </p>
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Area
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stackId="pots"
              stroke={s.isSurplus ? SURPLUS_COLOR : s.color}
              strokeWidth={2}
              fill={s.isSurplus ? `url(#${SURPLUS_PATTERN_ID})` : s.color}
              fillOpacity={s.isSurplus ? 1 : STACK_TINT}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </div>
    </div>
  );
}
