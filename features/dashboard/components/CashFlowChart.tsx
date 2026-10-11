"use client";

import {useMemo} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import type {ChartPoint, Granularity} from "@/features/expense/shared/db/cumulativeChart";
import type {BaselineMetric} from "@/features/settings/lookback";
import type {ChartMode} from "@/features/expense/shared/db/cumulativeChart";
import ChartModeToggle from "@/components/ChartModeToggle";

type SeriesData = Partial<Record<Granularity, ChartPoint[]>>;

type SeriesKey = "income" | "expense";

// Savings are left out on purpose: the Gespart KPI sits right above and the Sparen page charts them.
const SERIES: {key: SeriesKey; color: string; label: "kpiIncome" | "kpiExpenses"}[] = [
  {key: "income", color: "var(--success)", label: "kpiIncome"},
  {key: "expense", color: "var(--danger)", label: "kpiExpenses"},
];

type MergedPoint = {label: string} & Partial<Record<`${SeriesKey}${"" | "Upcoming" | "Previous"}`, number | null>>;

// Dashboard cash-flow (Phase 12, revised): income (green) and expense (red) on one shared axis, so the
// gap reads as the period's net at a glance. Dashed continuations are each stream's projected
// (upcoming) portion; the faint dotted lines are each stream's rolling baseline. Both views share
// label sets per granularity, so they zip by index.
export default function CashFlowChart({
  income,
  expense,
  granularity,
  baselineMetric = "MEAN",
}: {
  income: SeriesData;
  expense: SeriesData;
  granularity: Granularity;
  baselineMetric?: BaselineMetric;
  mode?: ChartMode;
}) {
  const format = useFormatter();
  const t = useTranslations("dashboard");
  const tChart = useTranslations("chart");
  const baselineLabel = tChart(baselineMetric === "MEDIAN" ? "median" : "average");

  const points = useMemo(() => {
    const data: Record<SeriesKey, ChartPoint[]> = {
      income: income[granularity] ?? [],
      expense: expense[granularity] ?? [],
    };
    const length = Math.max(...SERIES.map(({key}) => data[key].length));
    const merged: MergedPoint[] = Array.from({length}, (_, i) => {
      const point: MergedPoint = {label: SERIES.map(({key}) => data[key][i]?.label).find(Boolean) ?? ""};
      for (const {key} of SERIES) {
        point[key] = data[key][i]?.current ?? null;
        point[`${key}Upcoming`] = data[key][i]?.upcoming;
        point[`${key}Previous`] = data[key][i]?.previous ?? null;
      }
      return point;
    });
    return merged;
  }, [income, expense, granularity]);
  const series = SERIES;

  return (
    <Card className="flex h-full min-h-0 flex-col">
      {/* Header is a color legend only: the period unit + navigator live in the dashboard toolbar, and
          the money totals live in the KPI cards. */}
      <Card.Header className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm">{t("cashFlowTitle")}</p>
        {series.map(({key, color, label}) => (
          <span key={key} className="flex items-center gap-1.5 text-sm text-muted">
            <span className="size-2.5 rounded-full" style={{background: color}}/>
            {t(label)}
          </span>
        ))}

        {/* Same ?cm param as every other chart, so the shape stays in sync across the app. */}
        <ChartModeToggle className="ml-auto"/>
      </Card.Header>

      <Card.Content className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="min-h-[12rem] flex-1">
          <LineChart data={points} margin={{top: 12, right: 12, left: 0, bottom: 0}} width="100%" height="100%">
            {/* Rolling baselines first, so they sit behind the solid current lines. */}
            {series.map(({key, color, label}) => (
              <Line
                key={`${key}Previous`}
                type="monotone"
                dataKey={`${key}Previous`}
                name={`${t(label)} ${baselineLabel}`}
                stroke={color}
                strokeOpacity={0.45}
                strokeDasharray="2 3"
                strokeWidth={2}
                dot={false}
                activeDot={false}
              />
            ))}
            {series.flatMap(({key, color, label}) => [
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={t(label)}
                stroke={color}
                strokeWidth={3}
                dot={false}
                activeDot={{r: 5}}
              />,
              <Line
                key={`${key}Upcoming`}
                type="monotone"
                dataKey={`${key}Upcoming`}
                name={tChart("upcoming")}
                stroke={color}
                strokeDasharray="5 5"
                strokeWidth={3}
                dot={false}
                activeDot={{r: 5}}
                connectNulls={false}
              />,
            ])}

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
              domain={["dataMin - 80", "dataMax + 80"]}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={(value) => format.number(Number(value), "integer")}
              tick={{fontSize: "0.875rem", fill: "var(--muted)"}}
            />
            {/* One row per series: the actual value (or the forecast past today), Ø beside it. Where the
                solid and dashed lines meet both carry a value; the actual one wins. */}
            <Tooltip
              cursor={{strokeDasharray: "3 3"}}
              content={({active, payload, label}) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as MergedPoint;
                return (
                  <div className="rounded-[var(--radius)] border border-[var(--default)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-semibold">{label}</p>
                    {series.map(({key, color, label: name}) => {
                      const value = point[key] ?? point[`${key}Upcoming`];
                      const previous = point[`${key}Previous`];
                      return (
                        <p key={key} className="flex items-baseline justify-between gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{background: color}}/>
                            {t(name)}
                          </span>
                          <span className="tabular-nums">
                            {value == null ? "–" : format.number(value, "currencyWhole")}
                            {previous != null ? (
                              <span className="ms-2 text-muted">{baselineLabel} {format.number(previous, "currencyWhole")}</span>
                            ) : null}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                );
              }}
            />
          </LineChart>
        </div>
      </Card.Content>
    </Card>
  );
}
