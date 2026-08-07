"use client";

import {useMemo, useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {
  Card,
  Button,
  ButtonGroup,
  Chip,
} from "@heroui/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import PeriodNavigator from "@/components/PeriodNavigator";
import {useChartPeriodOffset} from "@/hooks/useChartPeriodOffset";

type Granularity = "1W" | "1M" | "1Y";

type ChartCardPoint = {label: string; current: number | null; previous: number; upcoming?: number | null};

const chartData: Record<Granularity, ChartCardPoint[]> = {
  "1W": [
    {label: "Mo", current: 1180, previous: 1160},
    {label: "Di", current: 1240, previous: 1220},
    {label: "Mi", current: 1215, previous: 1195},
    {label: "Do", current: 1320, previous: 1300},
    {label: "Fr", current: 1410, previous: 1390},
    {label: "Sa", current: 1390, previous: 1370},
    {label: "So", current: 1460, previous: 1440},
  ],
  "1M": Array.from({length: 30}, (_, i) => ({
    label: (i + 1).toString(),
    current: Math.floor(Math.random() * (1300 - 1000 + 1)) + 1000,
    previous: Math.floor(Math.random() * (1300 - 1000 + 1)) + 1000,
  })),
  "1Y": [
    {label: "Jan", current: 720, previous: 700},
    {label: "Feb", current: 860, previous: 840},
    {label: "Mär", current: 810, previous: 790},
    {label: "Apr", current: 980, previous: 960},
    {label: "Mai", current: 1050, previous: 1030},
    {label: "Jun", current: 1160, previous: 1140},
    {label: "Jul", current: 1240, previous: 1220},
    {label: "Aug", current: 1210, previous: 1190},
    {label: "Sep", current: 1330, previous: 1310},
    {label: "Okt", current: 1390, previous: 1370},
    {label: "Nov", current: 1420, previous: 1400},
    {label: "Dez", current: 1460, previous: 1420},
  ],
};

const GRANULARITY_ORDER: Granularity[] = ["1W", "1M", "1Y"];

type ChartCardProps = {
  title?: string;
  data?: Partial<Record<Granularity, ChartCardPoint[]>>;
  /** Whether a higher `current` than `previous` is good (income) or bad (expense) news. */
  polarity?: "higherIsBetter" | "lowerIsBetter";
};

export default function ChartCard({title, data, polarity = "higherIsBetter"}: ChartCardProps = {}) {
  const format = useFormatter();
  const t = useTranslations("chart");
  const source = data ?? chartData;
  const granularities = GRANULARITY_ORDER.filter((item) => source[item]);

  const [granularity, setGranularity] = useState<Granularity>(granularities[0] ?? "1W");
  const period = useChartPeriodOffset(granularity);

  // Switching the unit resets the navigator to the current period: the ?co offset is expressed in the
  // selected granularity's own unit, so carrying "−4" from months into years would silently mean 4
  // years back. Re-clicking the active unit keeps your position.
  function selectGranularity(next: Granularity) {
    if (next === granularity) return;
    setGranularity(next);
    if (!period.isCurrent) period.reset();
  }

  const points = useMemo(() => source[granularity] ?? [], [source, granularity]);

  const {current, previous, changePercent} = useMemo(() => {
    const latest = [...points].reverse().find((point) => point.current !== null);
    const current = latest?.current ?? 0;
    const previous = latest?.previous ?? current;
    const changePercent =
      previous === 0 ? 0 : ((current - previous) / previous) * 100;

    return {
      current,
      previous,
      changePercent,
    };
  }, [points]);

  const isPositive = changePercent >= 0;
  const isGoodTrend = polarity === "higherIsBetter" ? isPositive : !isPositive;

  return (
    <Card className="min-h-fit min-w-fit shrink-0">
      <Card.Header className="flex gap-4 flex-row items-center justify-between">
        <div>
          <p className="text-sm">{title}</p>

          <div className="mt-1 flex items-center gap-3">
            <h3 className="text-2xl font-semibold tracking-tight">
              {format.number(current, "currencyWhole")}
            </h3>

            <Chip
              size="sm"
              color={isGoodTrend ? "success" : "danger"}
              variant="soft"
            >
              {isPositive ? "+" : ""}
              {changePercent.toFixed(1)}%
            </Chip>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data ? (
            <PeriodNavigator
              label={period.label}
              isCurrent={period.isCurrent}
              onStep={period.step}
              onReset={period.reset}
            />
          ) : null}
          {granularities.length > 1 && (
            <ButtonGroup size="sm">
              {granularities.map((item) => (
                <Button
                  key={item}
                  variant={granularity === item ? "secondary" : "tertiary"}
                  onPress={() => selectGranularity(item)}
                >
                  {item}
                </Button>
              ))}
            </ButtonGroup>
          )}
        </div>
      </Card.Header>

      <Card.Content className="pt-2">
        <div className="h-40">
          <LineChart
            data={points}
            margin={{top: 12, right: 12, left: 0, bottom: 0}}
            width="100%"
            height="100%"
          >
            <Line
              type="monotone"
              dataKey="previous"
              name={t("average")}
              stroke="color-mix(in srgb, var(--accent) 50%, white)"
              strokeDasharray="5 5"
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
            />
            <Line
              type="monotone"
              dataKey="current"
              name={t("current")}
              stroke="var(--accent)"
              strokeWidth={3}
              dot={false}
              activeDot={{r: 5}}
            />
            <Line
              type="monotone"
              dataKey="upcoming"
              name={t("upcoming")}
              stroke="var(--accent)"
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
              tick={{
                fontSize: "0.875rem",
                fill: "var(--muted)",
              }}
            />

            <YAxis
              domain={["dataMin - 80", "dataMax + 80"]}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tickFormatter={(value) => format.number(Number(value), "integer")}
              style={{}}
              tick={{
                fontSize: "0.875rem",
                fill: "var(--muted)",
              }}
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
                value === null || value === undefined
                  ? "–"
                  : format.number(Number(value), "currencyWhole")
              }
            />
          </LineChart>
        </div>
      </Card.Content>
    </Card>
  );
}
