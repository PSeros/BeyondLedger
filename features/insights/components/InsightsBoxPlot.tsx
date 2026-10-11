"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import type {BoxStats} from "@/features/insights/stats";
import {seriesColor} from "@/features/insights/colors";

export type BoxPanel = {key: "expense" | "income"; boxes: BoxStats[]};

// Nice axis ticks from 0 to just past `max`.
function ticksFor(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw) ?? 10) * magnitude;
  return Array.from({length: Math.ceil(max / step) + 1}, (_, i) => i * step);
}

// Spread of single amounts per group, as horizontal box-and-whisker rows on one shared axis: box =
// middle half (Q1–Q3), bar = median, whiskers = the rest within 1.5 × IQR, dots = outliers.
export default function InsightsBoxPlot({panels}: {panels: BoxPanel[]}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const [shown, setShown] = useState(0);
  const panel = panels[Math.min(shown, panels.length - 1)];

  const max = Math.max(0, ...panel.boxes.flatMap((box) => [box.max, ...box.outliers]));
  const ticks = ticksFor(max);
  const top = ticks[ticks.length - 1] || 1;
  const x = (value: number) => `${(Math.max(0, value) / top) * 100}%`;
  const money = (value: number) => format.number(value, "currency");
  const color = seriesColor(panel.key, panels.length);

  return (
    <Card className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">{t("boxTitle")}</p>
          <p className="text-xs text-muted">{t("boxHint")}</p>
        </div>
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

      {panel.boxes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{t("noBreakdown")}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-evenly">
          {panel.boxes.map((box) => (
            <div
              key={box.label}
              className="group flex items-center gap-3 rounded-md py-1 hover:bg-[var(--default)]/40"
              title={t("boxTooltip", {n: box.n, min: money(box.min), q1: money(box.q1), median: money(box.median), q3: money(box.q3), max: money(box.max)})}
            >
              <span className="w-28 shrink-0 truncate text-sm">{box.label}</span>
              <div className="relative h-6 min-w-0 flex-1">
                <div className="absolute top-1/2 h-px bg-[var(--muted)]" style={{left: x(box.min), width: `calc(${x(box.max)} - ${x(box.min)})`}}/>
                <div className="absolute top-1.5 h-3 w-px bg-[var(--muted)]" style={{left: x(box.min)}}/>
                <div className="absolute top-1.5 h-3 w-px bg-[var(--muted)]" style={{left: x(box.max)}}/>
                <div
                  className="absolute inset-y-0.5 rounded"
                  style={{
                    left: x(box.q1),
                    width: `max(2px, calc(${x(box.q3)} - ${x(box.q1)}))`,
                    background: `color-mix(in oklab, ${color} 55%, transparent)`,
                  }}
                />
                <div className="absolute inset-y-0 w-0.5 rounded bg-[var(--foreground)]" style={{left: x(box.median)}}/>
                {box.outliers.map((value, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{left: x(value), background: color}}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <span className="w-28 shrink-0"/>
            <div className="relative h-4 min-w-0 flex-1 border-t border-[var(--border)]">
              {ticks.map((tick, i) => (
                <span
                  key={tick}
                  className={`absolute top-0.5 text-[0.7rem] text-muted tabular-nums ${i === 0 ? "" : i === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"}`}
                  style={{left: x(tick)}}
                >
                  {format.number(tick, "integer")}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
