"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis} from "recharts";
import {isoWeek} from "@/features/expense/shared/db/cumulativeChart";
import type {TimeUnit} from "@/features/insights/stats";
import {seriesColor} from "@/features/insights/colors";

export type TimePoint = {key: string; expense?: number; income?: number};

// Totals per day / week / month / year across the period.
export default function InsightsTimeChart({points, unit, series}: {
  points: TimePoint[];
  unit: TimeUnit;
  series: ("expense" | "income")[];
}) {
  const format = useFormatter();
  const t = useTranslations("insights");

  function label(key: string): string {
    if (unit === "year") return key;
    if (unit === "month") return format.dateTime(new Date(`${key}-01T00:00:00Z`), {month: "short", year: "2-digit", timeZone: "UTC"});
    const date = new Date(`${key}T00:00:00Z`);
    if (unit === "week") return t("weekLabel", {week: isoWeek(date)});
    return format.dateTime(date, {day: "2-digit", month: "2-digit", timeZone: "UTC"});
  }

  const meta = {
    expense: {name: t("domainExpense"), color: seriesColor("expense", series.length)},
    income: {name: t("domainIncome"), color: seriesColor("income", series.length)},
  };

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <Card.Header className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm">{t("timeChartTitle", {unit: t(`unit.${unit}`)})}</p>
        {series.length > 1
          ? series.map((key) => (
            <span key={key} className="flex items-center gap-1.5 text-sm text-muted">
              <span className="size-2.5 rounded-full" style={{background: meta[key].color}}/>
              {meta[key].name}
            </span>
          ))
          : null}
      </Card.Header>
      <Card.Content className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="min-h-0 flex-1">
          <BarChart data={points} margin={{top: 8, right: 8, left: 0, bottom: 0}} width="100%" height="100%" barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6}/>
            <XAxis
              dataKey="key"
              tickFormatter={label}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => format.number(Number(value), "integer")}
              tick={{fontSize: "0.75rem", fill: "var(--muted)"}}
            />
            <Tooltip
              cursor={{fill: "var(--default)", fillOpacity: 0.4}}
              labelFormatter={(key) => label(String(key))}
              contentStyle={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--default)",
                background: "var(--surface)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => format.number(Number(value), "currency")}
            />
            {series.map((key) => (
              <Bar key={key} dataKey={key} name={meta[key].name} fill={meta[key].color} radius={[4, 4, 0, 0]} maxBarSize={24}/>
            ))}
          </BarChart>
        </div>
      </Card.Content>
    </Card>
  );
}
