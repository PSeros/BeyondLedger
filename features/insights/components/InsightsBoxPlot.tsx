"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import type {BoxStats} from "@/features/insights/stats";
import {seriesColor} from "@/features/insights/colors";
import {tooltipStyle} from "@/features/insights/components/InsightsDonut";

export type BoxPanel = {key: "expense" | "income"; boxes: BoxStats[]};

// Nice axis ticks from 0 to just past `max`.
function ticksFor(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw) ?? 10) * magnitude;
  return Array.from({length: Math.ceil(max / step) + 1}, (_, i) => i * step);
}

// Spread of the values (page-wide unit) per group (page-wide grouping, shared with the share card), as
// vertical boxes on one axis. Box = middle half (Q1–Q3), bar = median, whiskers = the rest within
// 1.5 × IQR, dots = outliers. Hover or focus a column for the exact numbers.
export default function InsightsBoxPlot({panels, title, hint}: {panels: BoxPanel[]; title: string; hint: string}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const [shown, setShown] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const panel = panels[Math.min(shown, panels.length - 1)];
  const boxes = panel.boxes;
  const color = seriesColor(panel.key, panels.length);

  const ticks = ticksFor(Math.max(0, ...boxes.flatMap((box) => [box.max, ...box.outliers])));
  const top = ticks[ticks.length - 1] || 1;
  const y = (value: number) => `${(Math.max(0, value) / top) * 100}%`;
  const span = (from: number, to: number) => `calc(${y(to)} - ${y(from)})`;
  const money = (value: number) => format.number(value, "currency");
  const active = hovered != null ? boxes[hovered] : null;

  return (
    <Card className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm">{title}</p>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {boxes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("noBreakdown")}</p>
      ) : (
        <div className="flex min-h-0 flex-1 gap-2">
          {/* y-axis */}
          <div className="relative w-10 shrink-0 pb-6">
            <div className="relative h-full">
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className="absolute right-0 translate-y-1/2 text-[0.7rem] text-muted tabular-nums"
                  style={{bottom: y(tick)}}
                >
                  {format.number(tick, "integer")}
                </span>
              ))}
            </div>
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              {ticks.map((tick) => (
                <div key={tick} className="absolute inset-x-0 h-px bg-[var(--border)] opacity-60" style={{bottom: y(tick)}}/>
              ))}
              <div className="absolute inset-0 flex">
                {boxes.map((box, i) => (
                  <div
                    key={box.label}
                    tabIndex={0}
                    aria-label={`${box.label}: ${t("stat.median")} ${money(box.median)}`}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    className={`relative h-full min-w-0 flex-1 rounded-md outline-none transition-colors ${hovered === i ? "bg-[var(--default)]/50" : ""}`}
                  >
                    <div className="absolute left-1/2 w-px -translate-x-1/2 bg-[var(--muted)]" style={{bottom: y(box.min), height: span(box.min, box.max)}}/>
                    <div className="absolute left-1/2 h-px w-3 -translate-x-1/2 bg-[var(--muted)]" style={{bottom: y(box.min)}}/>
                    <div className="absolute left-1/2 h-px w-3 -translate-x-1/2 bg-[var(--muted)]" style={{bottom: y(box.max)}}/>
                    <div
                      className="absolute left-1/2 w-[min(60%,2rem)] -translate-x-1/2 rounded"
                      style={{
                        bottom: y(box.q1),
                        height: `max(2px, ${span(box.q1, box.q3)})`,
                        background: `color-mix(in oklab, ${color} 55%, transparent)`,
                      }}
                    />
                    <div className="absolute left-1/2 h-0.5 w-[min(60%,2rem)] -translate-x-1/2 rounded bg-[var(--foreground)]" style={{bottom: y(box.median)}}/>
                    {box.outliers.map((value, j) => (
                      <div
                        key={j}
                        className="absolute left-1/2 size-1.5 -translate-x-1/2 translate-y-1/2 rounded-full"
                        style={{bottom: y(value), background: color}}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {active && hovered != null ? (
                // Beside the hovered column, never over it: right of it in the left half, left of it
                // in the right half.
                <div
                  className={`pointer-events-none absolute top-0 z-10 w-max px-3 py-2 text-xs ${
                    hovered < boxes.length / 2 ? "ms-1" : "-ms-1 -translate-x-full"
                  }`}
                  style={{
                    ...tooltipStyle,
                    left: `${((hovered < boxes.length / 2 ? hovered + 1 : hovered) / boxes.length) * 100}%`,
                  }}
                >
                  <p className="mb-1 text-sm font-semibold">{active.label}</p>
                  <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 tabular-nums">
                    <dt className="text-muted">{t("stat.max")}</dt><dd className="text-end">{money(active.max)}</dd>
                    <dt className="text-muted">Q3</dt><dd className="text-end">{money(active.q3)}</dd>
                    <dt className="text-muted">{t("stat.median")}</dt><dd className="text-end font-semibold">{money(active.median)}</dd>
                    <dt className="text-muted">Q1</dt><dd className="text-end">{money(active.q1)}</dd>
                    <dt className="text-muted">{t("stat.min")}</dt><dd className="text-end">{money(active.min)}</dd>
                    <dt className="text-muted">{t("stat.mean")}</dt><dd className="text-end">{money(active.mean)}</dd>
                    {active.outOf != null ? (
                      <><dt className="text-muted">{t("boxActiveDays")}</dt><dd className="text-end">{t("boxOutOf", {n: active.n, of: active.outOf})}</dd></>
                    ) : (
                      <><dt className="text-muted">{t("stat.count")}</dt><dd className="text-end">{format.number(active.n)}</dd></>
                    )}
                    {active.outliers.length ? (
                      <><dt className="text-muted">{t("boxOutliers")}</dt><dd className="text-end">{format.number(active.outliers.length)}</dd></>
                    ) : null}
                  </dl>
                </div>
              ) : null}
            </div>
            <div className="flex h-6 shrink-0 items-end">
              {boxes.map((box) => (
                <span key={box.label} title={box.label} className="min-w-0 flex-1 truncate px-0.5 text-center text-xs text-muted">
                  {box.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
