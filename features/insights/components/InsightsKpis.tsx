import {getFormatter, getTranslations} from "next-intl/server";
import {Card, Chip} from "@heroui/react";
import {FiArrowDown, FiArrowUp} from "react-icons/fi";
import type {InsightsRow} from "@/features/insights/db/insightsRows";
import type {InsightsDomain, StatUnit} from "@/features/insights/params";
import {computeStats, samplesFor} from "@/features/insights/stats";

type Tile = {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  kind: "currency" | "count" | "percent";
  higherIsBetter: boolean;
  hint?: string;
};

type Span = {start: Date; end: Date};

// The headline strip: four tiles, each with its change against the same stretch of the previous
// period. One domain → sum / mean / median / count over the stats unit; both → expenses / income /
// net / savings rate.
export default async function InsightsKpis({rows, previousRows, domain, unit, span, previousSpan}: {
  rows: InsightsRow[];
  previousRows: InsightsRow[] | null;
  domain: InsightsDomain;
  unit: StatUnit;
  span: Span;
  previousSpan: Span | null;
}) {
  const t = await getTranslations("insights");
  const format = await getFormatter();

  const sumOf = (list: InsightsRow[] | null, d: "expense" | "income") =>
    list == null ? null : list.filter((row) => row.domain === d).reduce((sum, row) => sum + row.amount, 0);

  let tiles: Tile[];
  if (domain === "both") {
    const exp = sumOf(rows, "expense") ?? 0;
    const inc = sumOf(rows, "income") ?? 0;
    const pExp = sumOf(previousRows, "expense");
    const pInc = sumOf(previousRows, "income");
    const rate = (i: number | null, e: number | null) => (i != null && e != null && i > 0 ? (i - e) / i : null);
    tiles = [
      {key: "exp", label: t("domainExpense"), value: exp, previous: pExp, kind: "currency", higherIsBetter: false},
      {key: "inc", label: t("domainIncome"), value: inc, previous: pInc, kind: "currency", higherIsBetter: true},
      {key: "net", label: t("net"), value: inc - exp, previous: pInc != null && pExp != null ? pInc - pExp : null, kind: "currency", higherIsBetter: true},
      {key: "rate", label: t("savingsRate"), value: rate(inc, exp), previous: rate(pInc, pExp), kind: "percent", higherIsBetter: true},
    ];
  } else {
    const d = domain;
    const mine = (list: InsightsRow[]) => list.filter((row) => row.domain === d);
    const now = computeStats(samplesFor(mine(rows), unit, span));
    const before = previousRows && previousSpan ? computeStats(samplesFor(mine(previousRows), unit, previousSpan)) : null;
    const better = d === "income";
    const per = t(`unit.${unit}`);
    tiles = [
      {key: "sum", label: t("stat.sum"), value: now.sum, previous: before?.sum ?? null, kind: "currency", higherIsBetter: better},
      {key: "mean", label: t("kpiPer", {stat: t("stat.mean"), unit: per}), value: now.mean, previous: before?.mean ?? null, kind: "currency", higherIsBetter: better},
      {key: "median", label: t("kpiPer", {stat: t("stat.median"), unit: per}), value: now.median, previous: before?.median ?? null, kind: "currency", higherIsBetter: better},
      {key: "count", label: t("kpiCount", {unit: per}), value: now.count, previous: before?.count ?? null, kind: "count", higherIsBetter: better},
    ];
  }

  const show = (tile: Tile, value: number | null) => {
    if (value == null) return "–";
    if (tile.kind === "count") return format.number(value);
    if (tile.kind === "percent") return format.number(value, {style: "percent", maximumFractionDigits: 1});
    return format.number(value, "currency");
  };

  return (
    <div className="grid h-full grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
      {tiles.map((tile) => {
        const hasDelta = tile.value != null && tile.previous != null && tile.previous !== 0;
        // Percent-point change for a rate; relative change for everything else.
        const delta = !hasDelta ? null
          : tile.kind === "percent" ? (tile.value! - tile.previous!) * 100
            : ((tile.value! - tile.previous!) / Math.abs(tile.previous!)) * 100;
        const isUp = (delta ?? 0) >= 0;
        const color = delta == null || Math.abs(delta) < 0.05 ? "default" : isUp === tile.higherIsBetter ? "success" : "danger";
        return (
          <Card key={tile.key} className="flex h-full flex-col justify-between gap-1 p-3 sm:p-4">
            <span className="truncate text-xs text-muted sm:text-sm">{tile.label}</span>
            <div className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1">
              <span className="truncate text-lg font-semibold sm:text-2xl">{show(tile, tile.value)}</span>
              {delta != null ? (
                <Chip
                  variant="soft"
                  color={color}
                  size="sm"
                  title={t("vsPrevious", {value: show(tile, tile.previous)})}
                >
                  {isUp ? <FiArrowUp/> : <FiArrowDown/>}
                  <Chip.Label>
                    {format.number(Math.abs(delta), {maximumFractionDigits: 1})}{tile.kind === "percent" ? " pp" : " %"}
                  </Chip.Label>
                </Chip>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
