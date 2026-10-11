"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Area, AreaChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis} from "recharts";
import {seriesColor} from "@/features/insights/colors";
import {tooltipStyle} from "@/features/insights/components/InsightsDonut";
import InsightsCardTitle from "@/features/insights/components/InsightsCardTitle";
import type {KdePoint} from "@/features/insights/stats";

const LABEL_KEYS = {expense: "domainExpense", income: "domainIncome"} as const;

// How the values (per stats unit) are distributed, as a smoothed density curve (KDE) with a thin line
// at each median. The y-axis is left off on purpose — a density's height only means "more common
// here"; the tooltip gives the readable number: the share of values at or below the hovered amount.
export default function InsightsKde({points, series, medians, unitLabel}: {
  points: KdePoint[];
  series: ("expense" | "income")[];
  medians: (number | null)[];
  unitLabel: string;
}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const data = points.map((point) => ({
    x: point.x,
    ...Object.fromEntries(series.map((key, i) => [key, point.densities[i]])),
    ...Object.fromEntries(series.map((key, i) => [`${key}Below`, point.below[i]])),
  }));

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <InsightsCardTitle title={t("kdeTitle")} info={t("kdeHint", {unit: unitLabel})}/>
        {series.length > 1 ? (
          <div className="flex gap-4">
            {series.map((key) => (
              <span key={key} className="flex items-center gap-1.5 text-sm text-muted">
                <span className="size-2.5 rounded-full" style={{background: seriesColor(key, series.length)}}/>
                {t(LABEL_KEYS[key])}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("kdeTooFew")}</p>
      ) : (
        <div className="min-h-0 flex-1">
          <AreaChart data={data} width="100%" height="100%" margin={{top: 16, right: 12, left: 12, bottom: 0}}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6}/>
            <XAxis
              type="number"
              dataKey="x"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(value) => format.number(Number(value), "currencyWhole")}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
            />
            <YAxis hide/>
            <Tooltip
              cursor={{stroke: "var(--muted)", strokeWidth: 1}}
              content={({active, payload, label}) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as Record<string, number>;
                return (
                  <div style={tooltipStyle} className="px-3 py-2 text-xs">
                    <p className="mb-1 text-sm font-semibold">{format.number(Number(label), "currency")}</p>
                    {series.map((key) => (
                      <p key={key} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 rounded" style={{background: seriesColor(key, series.length)}}/>
                        {t("kdeBelow", {
                          share: format.number(row[`${key}Below`] ?? 0, {style: "percent", maximumFractionDigits: 0}),
                        })}
                        {series.length > 1 ? <span className="text-muted">({t(LABEL_KEYS[key])})</span> : null}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {series.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={seriesColor(key, series.length)}
                strokeWidth={2}
                fill={seriesColor(key, series.length)}
                fillOpacity={0.12}
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            ))}
            {series.map((key, i) => (medians[i] != null ? (
              <ReferenceLine
                key={`${key}-median`}
                x={medians[i]!}
                stroke={seriesColor(key, series.length)}
                strokeWidth={1}
                label={{value: t("stat.median"), position: "top", fill: "var(--muted)", fontSize: 11}}
              />
            ) : null))}
          </AreaChart>
        </div>
      )}
    </Card>
  );
}
