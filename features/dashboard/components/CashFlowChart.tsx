"use client";

import {useMemo} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Card} from "@heroui/react";
import {Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import type {ChartPoint, Granularity} from "@/features/expense/shared/db/cumulativeChart";

type SeriesData = Partial<Record<Granularity, ChartPoint[]>>;

const INCOME_COLOR = "var(--success)";
const EXPENSE_COLOR = "var(--danger)";

type MergedPoint = {
  label: string;
  income: number | null;
  incomeUpcoming?: number | null;
  incomePrevious: number | null;
  expense: number | null;
  expenseUpcoming?: number | null;
  expensePrevious: number | null;
};

// Dashboard cash-flow (Phase 12, revised): income (green) and expense (red) on one shared axis, so
// the gap between the two lines reads as the month's/year's net at a glance. Dashed continuations
// are each stream's projected (upcoming) portion; the faint dotted lines are each stream's rolling
// baseline (average pace of the prior periods) so you can read this period against the norm. Income &
// expense views share label sets per granularity (same buildWeek/Month/YearView), so they zip by index.
export default function CashFlowChart({
  income,
  expense,
  granularity,
}: {income: SeriesData; expense: SeriesData; granularity: Granularity}) {
  const format = useFormatter();
  const t = useTranslations("dashboard");
  const tChart = useTranslations("chart");

  const points = useMemo<MergedPoint[]>(() => {
    const inc = income[granularity] ?? [];
    const exp = expense[granularity] ?? [];
    const length = Math.max(inc.length, exp.length);
    return Array.from({length}, (_, i) => ({
      label: inc[i]?.label ?? exp[i]?.label ?? "",
      income: inc[i]?.current ?? null,
      incomeUpcoming: inc[i]?.upcoming,
      incomePrevious: inc[i]?.previous ?? null,
      expense: exp[i]?.current ?? null,
      expenseUpcoming: exp[i]?.upcoming,
      expensePrevious: exp[i]?.previous ?? null,
    }));
  }, [income, expense, granularity]);

  return (
    <Card className="flex h-full min-h-0 flex-col">
      {/* Header is a color legend only: the period unit + navigator live in the dashboard toolbar, and
          the money totals now live in the KPI cards (dropped here to avoid mirroring them). This just
          names which line is which. */}
      <Card.Header className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-sm">{t("cashFlowTitle")}</p>
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <span className="size-2.5 rounded-full" style={{background: INCOME_COLOR}}/>
          {t("kpiIncome")}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-muted">
          <span className="size-2.5 rounded-full" style={{background: EXPENSE_COLOR}}/>
          {t("kpiExpenses")}
        </span>
      </Card.Header>

      <Card.Content className="flex min-h-0 flex-1 flex-col pt-2">
        <div className="min-h-[12rem] flex-1">
          <LineChart data={points} margin={{top: 12, right: 12, left: 0, bottom: 0}} width="100%" height="100%">
            {/* Rolling baselines first, so they sit behind the solid current lines: each stream's
                average pace over the prior periods, drawn faint + dotted in its own hue. */}
            <Line
              type="monotone"
              dataKey="incomePrevious"
              name={`${t("kpiIncome")} ${tChart("average")}`}
              stroke={INCOME_COLOR}
              strokeOpacity={0.45}
              strokeDasharray="2 3"
              strokeWidth={2}
              dot={false}
              activeDot={{r: 4}}
            />
            <Line
              type="monotone"
              dataKey="expensePrevious"
              name={`${t("kpiExpenses")} ${tChart("average")}`}
              stroke={EXPENSE_COLOR}
              strokeOpacity={0.45}
              strokeDasharray="2 3"
              strokeWidth={2}
              dot={false}
              activeDot={{r: 4}}
            />
            <Line
              type="monotone"
              dataKey="income"
              name={t("kpiIncome")}
              stroke={INCOME_COLOR}
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
            />
            <Line
              type="monotone"
              dataKey="incomeUpcoming"
              name={tChart("upcoming")}
              stroke={INCOME_COLOR}
              strokeDasharray="5 5"
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name={t("kpiExpenses")}
              stroke={EXPENSE_COLOR}
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
            />
            <Line
              type="monotone"
              dataKey="expenseUpcoming"
              name={tChart("upcoming")}
              stroke={EXPENSE_COLOR}
              strokeDasharray="5 5"
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
              connectNulls={false}
            />

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
            <Tooltip
              cursor={{strokeDasharray: "3 3"}}
              contentStyle={{
                borderRadius: "var(--radius)",
                border: "1px solid var(--default)",
                background: "var(--surface)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
              }}
              formatter={(value) =>
                value === null || value === undefined ? "–" : format.number(Number(value), "currencyWhole")
              }
            />
          </LineChart>
        </div>
      </Card.Content>
    </Card>
  );
}
