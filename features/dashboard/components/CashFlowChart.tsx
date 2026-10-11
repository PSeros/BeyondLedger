"use client";

import {useMemo} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Area, ComposedChart, Line, Tooltip, XAxis, YAxis} from "recharts";
import type {ChartMode, ChartPoint, Granularity} from "@/features/expense/shared/db/cumulativeChart";
import ChartModeToggle from "@/components/ChartModeToggle";
import {AREA_TINT, STACK_TINT} from "@/components/chartTints";

type SeriesData = Partial<Record<Granularity, ChartPoint[]>>;

const INCOME = "var(--success)";
const EXPENSE = "var(--danger)";
const SAVING = "var(--accent)";

type Point = {
  label: string;
  income: number | null;
  incomeUpcoming: number | null;
  expense: number | null;
  expenseUpcoming: number | null;
  saving: number | null;
  savingUpcoming: number | null;
};

// Dashboard cash flow: where the income went. Expenses and savings are stacked; income is a line on
// top, so the gap between the stack and the line is the Überschuss (and a stack above the line means
// more went out than came in). Past today the same shapes continue lighter and dashed as the forecast.
export default function CashFlowChart({income, expense, saving, granularity}: {
  income: SeriesData;
  expense: SeriesData;
  saving: SeriesData;
  granularity: Granularity;
  mode?: ChartMode;
}) {
  const format = useFormatter();
  const t = useTranslations("dashboard");
  const tChart = useTranslations("chart");

  const points = useMemo<Point[]>(() => {
    const inc = income[granularity] ?? [];
    const exp = expense[granularity] ?? [];
    const sav = saving[granularity] ?? [];
    const length = Math.max(inc.length, exp.length, sav.length);
    const value = (p?: ChartPoint) => p?.current ?? null;
    const upcoming = (p?: ChartPoint) => p?.upcoming ?? null;
    // An account without savings still needs a 0 saving band wherever expenses are drawn.
    return Array.from({length}, (_, i) => ({
      label: inc[i]?.label ?? exp[i]?.label ?? sav[i]?.label ?? "",
      income: value(inc[i]),
      incomeUpcoming: upcoming(inc[i]),
      expense: value(exp[i]),
      expenseUpcoming: upcoming(exp[i]),
      saving: value(sav[i]) ?? (value(exp[i]) != null ? 0 : null),
      savingUpcoming: upcoming(sav[i]) ?? (upcoming(exp[i]) != null ? 0 : null),
    }));
  }, [income, expense, saving, granularity]);

  const legend = [
    {key: "income", name: t("kpiIncome"), color: INCOME, line: true},
    {key: "expense", name: t("kpiExpenses"), color: EXPENSE},
    {key: "saving", name: t("chartSaving"), color: SAVING},
  ];

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <Card.Header className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm">{t("cashFlowTitle")}</p>
        {legend.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5 text-sm text-muted">
            {item.line
              ? <span className="h-0.5 w-3 rounded-full" style={{background: item.color}}/>
              : <span className="size-2.5 rounded-sm" style={{background: item.color, opacity: 0.7}}/>}
            {item.name}
          </span>
        ))}
        <ChartModeToggle className="ml-auto"/>
      </Card.Header>

      <Card.Content className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="min-h-[12rem] flex-1">
          <ComposedChart data={points} margin={{top: 12, right: 12, left: 0, bottom: 0}} width="100%" height="100%">
            {/* Realized: stacked expenses + savings. */}
            <Area type="monotone" dataKey="expense" stackId="now" stroke={EXPENSE} strokeWidth={2} fill={EXPENSE} fillOpacity={STACK_TINT} isAnimationActive={false} activeDot={false}/>
            <Area type="monotone" dataKey="saving" stackId="now" stroke={SAVING} strokeWidth={2} fill={SAVING} fillOpacity={STACK_TINT} isAnimationActive={false} activeDot={false}/>
            {/* Forecast: the same stack, lighter and dashed. */}
            <Area type="monotone" dataKey="expenseUpcoming" stackId="next" stroke={EXPENSE} strokeWidth={2} strokeDasharray="5 5" fill={EXPENSE} fillOpacity={AREA_TINT} isAnimationActive={false} activeDot={false} connectNulls={false}/>
            <Area type="monotone" dataKey="savingUpcoming" stackId="next" stroke={SAVING} strokeWidth={2} strokeDasharray="5 5" fill={SAVING} fillOpacity={AREA_TINT} isAnimationActive={false} activeDot={false} connectNulls={false}/>
            {/* Income on top: the gap down to the stack is what's left over. */}
            <Line type="monotone" dataKey="income" stroke={INCOME} strokeWidth={3} dot={false} activeDot={{r: 5}} isAnimationActive={false}/>
            <Line type="monotone" dataKey="incomeUpcoming" stroke={INCOME} strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{r: 5}} connectNulls={false} isAnimationActive={false}/>

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              // Same reasoning as components/ChartCard: a fixed stride tuned for desktop collides at
              // phone widths, so let recharts drop overlapping ticks from the measured width.
              interval="preserveStartEnd"
              tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={(value) => format.number(Number(value), "integer")}
              tick={{fontSize: "0.875rem", fill: "var(--muted)"}}
            />
            {/* Income, expenses, saved and what's left. Where realized and forecast meet, realized wins. */}
            <Tooltip
              cursor={{strokeDasharray: "3 3"}}
              content={({active, payload, label}) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                const isForecast = p.income == null && p.expense == null;
                const inc = p.income ?? p.incomeUpcoming;
                const exp = p.expense ?? p.expenseUpcoming;
                const sav = p.saving ?? p.savingUpcoming;
                const left = inc != null && exp != null ? inc - exp - (sav ?? 0) : null;
                const money = (v: number | null) => (v == null ? "–" : format.number(v, "currencyWhole"));
                const rows = [
                  {name: t("kpiIncome"), color: INCOME, value: inc},
                  {name: t("kpiExpenses"), color: EXPENSE, value: exp},
                  {name: t("chartSaving"), color: SAVING, value: sav},
                ];
                return (
                  <div className="min-w-44 rounded-[var(--radius)] border border-[var(--default)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-semibold">
                      {label}{isForecast ? <span className="ms-1.5 font-normal text-muted">{tChart("upcoming")}</span> : null}
                    </p>
                    {rows.map((row) => (
                      <p key={row.name} className="flex justify-between gap-4">
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{background: row.color}}/>{row.name}</span>
                        <span className="tabular-nums">{money(row.value)}</span>
                      </p>
                    ))}
                    <p className="mt-1 flex justify-between gap-4 border-t border-[var(--default)] pt-1">
                      <span>{t("leftOver")}</span>
                      <span className={`tabular-nums ${left != null && left < 0 ? "text-danger" : ""}`}>{money(left)}</span>
                    </p>
                  </div>
                );
              }}
            />
          </ComposedChart>
        </div>
      </Card.Content>
    </Card>
  );
}
