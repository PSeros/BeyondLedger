"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {CartesianGrid, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis} from "recharts";
import {tooltipStyle} from "@/features/insights/components/InsightsDonut";
import {seriesColor} from "@/features/insights/colors";

export type ScatterPoint = {x: number; y: number; label: string; counterparty: string};

const LABEL_KEYS = {expense: "domainExpense", income: "domainIncome"} as const;

// Every single entry as a dot: date across, amount up. Outliers and clusters (the weekly shop, the
// monthly rent) stand out at a glance.
export default function InsightsScatter({series, start, end}: {
  series: {key: "expense" | "income"; points: ScatterPoint[]}[];
  start: number;
  end: number;
}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const date = (ms: number) => format.dateTime(new Date(ms), {day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC"});

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm">{t("scatterTitle")}</p>
        {series.length > 1
          ? series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-sm text-muted">
              <span className="size-2.5 rounded-full" style={{background: seriesColor(s.key, series.length)}}/>
              {t(LABEL_KEYS[s.key])}
            </span>
          ))
          : null}
      </div>
      <div className="min-h-0 flex-1">
        <ScatterChart width="100%" height="100%" margin={{top: 8, right: 8, left: 0, bottom: 0}}>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.6}/>
          <XAxis
            type="number"
            dataKey="x"
            domain={[start, end]}
            tickFormatter={date}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
          />
          <YAxis
            type="number"
            dataKey="y"
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tickFormatter={(value) => format.number(Number(value), "integer")}
            tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
          />
          <ZAxis range={[36, 36]}/>
          <Tooltip
            cursor={{strokeDasharray: "3 3"}}
            content={({active, payload}) => {
              const point = active ? (payload?.[0]?.payload as ScatterPoint | undefined) : undefined;
              if (!point) return null;
              return (
                <div style={tooltipStyle} className="px-3 py-2 text-sm">
                  <p className="font-semibold">{format.number(point.y, "currency")}</p>
                  <p>{point.label}</p>
                  <p className="text-muted">{point.counterparty} · {date(point.x)}</p>
                </div>
              );
            }}
          />
          {series.map((s) => (
            <Scatter key={s.key} data={s.points} fill={seriesColor(s.key, series.length)} fillOpacity={0.7}/>
          ))}
        </ScatterChart>
      </div>
    </Card>
  );
}
