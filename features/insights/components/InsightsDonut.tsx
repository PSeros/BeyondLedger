"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {Cell, Pie, PieChart, Tooltip} from "recharts";
import {OTHER_COLOR, PALETTE} from "@/features/dashboard/lib/donut";
import type {BreakdownRow} from "@/features/insights/stats";
import {SERIES_LABEL_KEYS} from "@/features/insights/colors";
import type {InsightsSeries} from "@/features/insights/params";

export type DonutPanel = {key: InsightsSeries; rows: BreakdownRow[]};

export const tooltipStyle = {
  borderRadius: "var(--radius)",
  border: "1px solid var(--default)",
  background: "var(--surface)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
};

// Share of the total per group (the page-wide ?by, shared with the spread card): a donut with the
// total in its hole and a ranked legend carrying name, amount and share. With both domains a small
// switch picks which one is shown.
export default function InsightsDonut({panels, groupLabel}: {panels: DonutPanel[]; groupLabel: string}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const [shown, setShown] = useState(0);
  const panel = panels[Math.min(shown, panels.length - 1)];

  const name = (row: BreakdownRow) => (row.isOther ? t("other") : row.isUntagged ? t("untagged") : row.label);
  const color = (row: BreakdownRow, i: number) => (row.isOther ? OTHER_COLOR : PALETTE[i % PALETTE.length]);
  const data = panel.rows.map((row, i) => ({name: name(row), amount: row.amount, fill: color(row, i)}));
  const total = panel.rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card className="flex h-full min-h-0 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">{t("shareTitle", {group: groupLabel})}</p>
        {panels.length > 1 ? (
          <ButtonGroup size="sm">
            {panels.map((p, i) => (
              <Button key={p.key} variant={i === shown ? "secondary" : "tertiary"} onPress={() => setShown(i)}>
                {t(SERIES_LABEL_KEYS[p.key])}
              </Button>
            ))}
          </ButtonGroup>
        ) : null}
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("noBreakdown")}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 sm:flex-row lg:flex-col">
          <div className="relative size-40 shrink-0">
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted">{t("stat.sum")}</span>
              <span className="text-base font-semibold">{format.number(total, "currencyWhole")}</span>
            </div>
            <PieChart width={160} height={160}>
              <Pie data={data} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={78} paddingAngle={2} cornerRadius={4} stroke="none">
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
