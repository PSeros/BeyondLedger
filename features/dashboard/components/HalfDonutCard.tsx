"use client";

import {useEffect, useRef, useState} from "react";
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

// The tuned intrinsic size. The chart never grows past this — it only shrinks to fit a narrow cell.
const MAX_CHART_WIDTH = 224;
const CHART_ASPECT = 128 / 224;

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

  // Recharts needs explicit pixel dimensions here — ResponsiveContainer reported width/height −1
  // while measuring inside this flex card. So keep explicit pixels, but measure the container
  // ourselves: on a phone the tile is far narrower than the tuned 224px and a fixed size would
  // overflow its cell.
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(MAX_CHART_WIDTH);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      if (width > 0) setChartWidth(Math.min(MAX_CHART_WIDTH, width));
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const chartHeight = Math.round(chartWidth * CHART_ASPECT);

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <Card.Header className="pb-0">
        <p className="text-sm">{title}</p>
      </Card.Header>
      <Card.Content className="flex flex-1 flex-col items-center justify-start pt-0">
        {slices.length === 0 ? (
          <p className="w-full max-w-64 py-12 text-center text-sm text-muted">{tCommon("noData")}</p>
        ) : (
          // No legend — it made the card too tall to stack two beside the chart. Slice identity
          // lives in the hover tooltip (name + amount); the % sits on each arc.
          <div ref={wrapperRef} className="relative w-full max-w-56" style={{height: chartHeight}}>
            {/* Total sits in the arc's mouth, BEHIND the z-10 chart wrapper so the hover tooltip
                (part of the chart) always draws above it; it shows through the transparent mouth. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
              <span className="text-xs text-muted">{t("total")}</span>
              <span className="text-lg font-semibold tabular-nums">{format.number(total, "currencyWhole")}</span>
            </div>
            <div className="relative z-10">
              {/* Explicit pixel size, measured above — see the ResizeObserver. All the Pie geometry
                  below is %-based, so it scales with these two numbers for free. */}
              <PieChart width={chartWidth} height={chartHeight}>
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
        )}
      </Card.Content>
    </Card>
  );
}
