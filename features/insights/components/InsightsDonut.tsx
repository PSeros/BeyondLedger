"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {Cell, Pie, PieChart, Tooltip} from "recharts";
import {OTHER_COLOR, PALETTE} from "@/features/dashboard/lib/donut";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import {BREAKDOWN_DIMENSIONS, type BreakdownDimension} from "@/features/insights/params";
import type {BreakdownRow} from "@/features/insights/stats";

export type DonutPanel = {key: "expense" | "income"; rows: BreakdownRow[]};

export const tooltipStyle = {
  borderRadius: "var(--radius)",
  border: "1px solid var(--default)",
  background: "var(--surface)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
};

// Share of the total per category / supplier / tag (?by — also drives the box plot): a donut with
// the total in its hole and a ranked legend carrying name, amount and share. With both domains a
// small switch picks which one is shown.
export default function InsightsDonut({panels}: {panels: DonutPanel[]}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const {query, update} = useInsightsParams();
  const [shown, setShown] = useState(0);
  const panel = panels[Math.min(shown, panels.length - 1)];

  const name = (row: BreakdownRow) => (row.isOther ? t("other") : row.isUntagged ? t("untagged") : row.label);
  const color = (row: BreakdownRow, i: number) => (row.isOther ? OTHER_COLOR : PALETTE[i % PALETTE.length]);
  const data = panel.rows.map((row, i) => ({name: name(row), amount: row.amount, fill: color(row, i)}));
  const total = panel.rows.reduce((sum, row) => sum + row.amount, 0);

  const dimensionLabels: Record<BreakdownDimension, string> = {
    category: t("byCategory"),
    counterparty: t("byCounterparty"),
    tag: t("byTag"),
  };

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">{t("shareTitle")}</p>
        {panels.length > 1 ? (
          <ButtonGroup size="sm">
            {panels.map((p, i) => (
              <Button key={p.key} variant={i === shown ? "secondary" : "tertiary"} onPress={() => setShown(i)}>
                {t(p.key === "expense" ? "domainExpense" : "domainIncome")}
              </Button>
            ))}
          </ButtonGroup>
        ) : null}
      </div>
      <ButtonGroup size="sm" className="self-start">
        {BREAKDOWN_DIMENSIONS.map((dimension) => (
          <Button
            key={dimension}
            variant={query.by === dimension ? "secondary" : "tertiary"}
            onPress={() => update({by: dimension === "category" ? null : dimension})}
          >
            {dimensionLabels[dimension]}
          </Button>
        ))}
      </ButtonGroup>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("noBreakdown")}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 sm:flex-row lg:flex-col">
          <div className="relative size-36 shrink-0">
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted">{t("stat.sum")}</span>
              <span className="text-base font-semibold">{format.number(total, "currencyWhole")}</span>
            </div>
            <PieChart width={144} height={144}>
              <Pie data={data} dataKey="amount" nameKey="name" innerRadius={50} outerRadius={70} paddingAngle={2} cornerRadius={4} stroke="none">
                {data.map((slice) => <Cell key={slice.name} fill={slice.fill}/>)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value, n) => [format.number(Number(value), "currency"), n]}/>
            </PieChart>
          </div>
          <ul className="flex w-full flex-col gap-1">
            {panel.rows.map((row, i) => (
              <li key={i} className="flex items-center gap-2 text-sm" title={t("entryCount", {count: row.count})}>
                <span className="size-2.5 shrink-0 rounded-full" style={{background: color(row, i)}}/>
                <span className={`min-w-0 flex-1 truncate ${row.isOther || row.isUntagged ? "text-muted" : ""}`}>{name(row)}</span>
                <span className="tabular-nums">{format.number(row.amount, "currencyWhole")}</span>
                <span className="w-11 text-end text-xs text-muted tabular-nums">
                  {format.number(total > 0 ? row.amount / total : 0, {style: "percent", maximumFractionDigits: 0})}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
