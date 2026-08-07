"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Cell, Pie, PieChart, Tooltip} from "recharts";
import type {PieLabelRenderProps} from "recharts";
import {collapseSmall, sliceColor, type DonutSlice} from "@/features/dashboard/lib/donut";

const tooltipStyle = {
  borderRadius: "var(--radius)",
  border: "1px solid var(--default)",
  background: "var(--surface)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
};

const RADIAN = Math.PI / 180;

// The % printed on each arc, only for slices big enough to hold the text (half-donut arcs are short,
// so the cutoff is higher than a full donut's). Recharts hands geometry as PieLabelRenderProps with
// optional / number|string fields, so coerce to numbers.
function renderArcLabel(props: PieLabelRenderProps) {
  const percent = Number(props.percent ?? 0);
  if (percent < 0.08) return null;
  const cx = Number(props.cx ?? 0);
  const cy = Number(props.cy ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      fontSize="0.7rem"
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
      style={{pointerEvents: "none"}}
    >
      {Math.round(percent * 100)}%
    </text>
  );
}

// A compact, content-width half-donut: rounded segments, the % on each big arc, the total in the arc's
// mouth, and a wrapped colour-chip legend (name + %) below. The card sizes to its content (w-fit),
// not the available width. The long tail folds into a muted "Other" slice.
export default function HalfDonutCard({title, rows}: {title: string; rows: DonutSlice[]}) {
  const format = useFormatter();
  const t = useTranslations("categoryChart");
  const tCommon = useTranslations("common");

  const slices = collapseSmall(rows, t("other"));
  const total = slices.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <Card.Header>
        <p className="text-sm">{title}</p>
      </Card.Header>
      <Card.Content className="flex flex-1 flex-col items-center justify-center pt-2">
        {slices.length === 0 ? (
          <p className="w-64 py-12 text-center text-sm text-muted">{tCommon("noData")}</p>
        ) : (
          <div className="flex w-64 flex-col items-center gap-4">
            <div className="relative h-36 w-64">
              {/* Total sits in the arc's mouth, BEHIND the z-10 chart wrapper so the hover tooltip
                  (part of the chart) always draws above it; it shows through the transparent mouth. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
                <span className="text-xs text-muted">{t("total")}</span>
                <span className="text-lg font-semibold tabular-nums">{format.number(total, "currencyWhole")}</span>
              </div>
              <div className="relative z-10">
                {/* Explicit pixel size (w-64 = 256, h-36 = 144) — no ResponsiveContainer, which
                    reported width/height −1 while measuring inside the w-fit/flex card. */}
                <PieChart width={256} height={144}>
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius="120%"
                    outerRadius="170%"
                    paddingAngle={2}
                    cornerRadius={8}
                    stroke="none"
                    labelLine={false}
                    label={renderArcLabel}
                  >
                    {slices.map((row, index) => (
                      <Cell key={row.id} fill={sliceColor(row, index)}/>
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{zIndex: 20}}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [format.number(Number(value), "currencyWhole"), name]}
                  />
                </PieChart>
              </div>
            </div>

            <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1.5">
              {slices.map((row, index) => {
                const pct = total > 0 ? (row.amount / total) * 100 : 0;
                return (
                  <li key={row.id} className="flex items-center gap-1.5 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{background: sliceColor(row, index)}}/>
                    <span className="max-w-32 truncate">{row.label}</span>
                    <span className="text-xs tabular-nums text-muted">{pct.toFixed(0)}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
