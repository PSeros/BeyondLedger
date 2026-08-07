"use client";

import {useMemo, useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {Line, LineChart, Tooltip, XAxis, YAxis} from "recharts";
import PeriodNavigator from "@/components/PeriodNavigator";
import {useChartPeriodOffset} from "@/hooks/useChartPeriodOffset";
import type {ChartPoint} from "@/features/expense/shared/db/cumulativeChart";

type Granularity = "1W" | "1M" | "1Y";
type SeriesData = Partial<Record<Granularity, ChartPoint[]>>;

const GRANULARITY_ORDER: Granularity[] = ["1W", "1M", "1Y"];

const INCOME_COLOR = "var(--success)";
const EXPENSE_COLOR = "var(--danger)";

type MergedPoint = {
  label: string;
  income: number | null;
  incomeUpcoming?: number | null;
  expense: number | null;
  expenseUpcoming?: number | null;
};

// Dashboard cash-flow (Phase 12, revised): income (green) and expense (red) on one shared axis, so
// the gap between the two lines reads as the month's/year's net at a glance. Dashed continuations
// are each stream's projected (upcoming) portion. Income & expense views share label sets per
// granularity (same buildWeek/Month/YearView), so they zip by index.
export default function CashFlowChart({income, expense}: {income: SeriesData; expense: SeriesData}) {
  const format = useFormatter();
  const t = useTranslations("dashboard");
  const tChart = useTranslations("chart");

  const granularities = GRANULARITY_ORDER.filter((g) => income[g] || expense[g]);
  const [granularity, setGranularity] = useState<Granularity>(granularities[0] ?? "1M");
  const period = useChartPeriodOffset(granularity);

  // Switching the unit resets the navigator to the current period: the ?co offset is expressed in the
  // selected granularity's own unit, so carrying "−4" from months into years would silently mean 4
  // years back. Re-clicking the active unit keeps your position.
  function selectGranularity(next: Granularity) {
    if (next === granularity) return;
    setGranularity(next);
    if (!period.isCurrent) period.reset();
  }

  const points = useMemo<MergedPoint[]>(() => {
    const inc = income[granularity] ?? [];
    const exp = expense[granularity] ?? [];
    const length = Math.max(inc.length, exp.length);
    return Array.from({length}, (_, i) => ({
      label: inc[i]?.label ?? exp[i]?.label ?? "",
      income: inc[i]?.current ?? null,
      incomeUpcoming: inc[i]?.upcoming,
      expense: exp[i]?.current ?? null,
      expenseUpcoming: exp[i]?.upcoming,
    }));
  }, [income, expense, granularity]);

  // Latest realized cumulative value per stream (for the header legend) + net.
  const {incomeTotal, expenseTotal} = useMemo(() => {
    const lastReal = (key: "income" | "expense") =>
      [...points].reverse().find((p) => p[key] !== null)?.[key] ?? 0;
    return {incomeTotal: lastReal("income") as number, expenseTotal: lastReal("expense") as number};
  }, [points]);
  const net = incomeTotal - expenseTotal;

  return (
    <Card className="min-h-fit min-w-fit shrink-0">
      <Card.Header className="flex flex-row items-start justify-between gap-4">
        <div>
          <p className="text-sm">{t("cashFlowTitle")}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="size-2.5 rounded-full" style={{background: INCOME_COLOR}}/>
              {t("kpiIncome")}
              <span className="font-semibold tabular-nums">{format.number(incomeTotal, "currencyWhole")}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="size-2.5 rounded-full" style={{background: EXPENSE_COLOR}}/>
              {t("kpiExpenses")}
              <span className="font-semibold tabular-nums">{format.number(expenseTotal, "currencyWhole")}</span>
            </span>
            <span className="text-sm text-muted">
              {t("kpiNet")}:{" "}
              <span className={`font-semibold tabular-nums ${net >= 0 ? "text-success" : "text-danger"}`}>
                {format.number(net, "currencyWhole")}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PeriodNavigator
            label={period.label}
            isCurrent={period.isCurrent}
            onStep={period.step}
            onReset={period.reset}
          />
          {granularities.length > 1 && (
            <ButtonGroup size="sm">
              {granularities.map((g) => (
                <Button
                  key={g}
                  variant={granularity === g ? "secondary" : "tertiary"}
                  onPress={() => selectGranularity(g)}
                >
                  {g}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </div>
      </Card.Header>

      <Card.Content className="pt-2">
        <div className="h-40">
          <LineChart data={points} margin={{top: 12, right: 12, left: 0, bottom: 0}} width="100%" height="100%">
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
              interval={granularity === "1M" ? 1 : 0}
              tick={{fontSize: "0.875rem", fill: "var(--muted)"}}
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
