"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis} from "recharts";
import {tooltipStyle} from "@/features/insights/components/InsightsDonut";
import {seriesColor} from "@/features/insights/colors";

export type MiniBarPoint = {label: string; expense?: number; income?: number};

const LABEL_KEYS = {expense: "domainExpense", income: "domainIncome"} as const;

// A small column chart tile, shared by the weekday pattern (money) and the histogram (counts).
export default function InsightsMiniBars({title, hint, points, series, valueKind}: {
  title: string;
  hint: string;
  points: MiniBarPoint[];
  series: ("expense" | "income")[];
  valueKind: "currency" | "count";
}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const show = (value: number) => (valueKind === "count" ? t("entryCount", {count: value}) : format.number(value, "currency"));

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 p-4">
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      <div className="min-h-0 flex-1">
        <BarChart data={points} width="100%" height="100%" margin={{top: 8, right: 4, left: -8, bottom: 0}} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6}/>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={6} interval="preserveStartEnd" tick={{fontSize: "0.7rem", fill: "var(--muted)"}}/>
          <YAxis
            axisLine={false}
            tickLine={false}
            width={44}
            allowDecimals={valueKind !== "count"}
            tickFormatter={(value) => format.number(Number(value), "integer")}
            tick={{fontSize: "0.7rem", fill: "var(--muted)"}}
          />
          <Tooltip cursor={{fill: "var(--default)", fillOpacity: 0.4}} contentStyle={tooltipStyle} formatter={(value, name) => [show(Number(value)), name]}/>
          {series.map((key) => (
            <Bar key={key} dataKey={key} name={t(LABEL_KEYS[key])} fill={seriesColor(key, series.length)} radius={[4, 4, 0, 0]} maxBarSize={24}/>
          ))}
        </BarChart>
      </div>
    </Card>
  );
}
