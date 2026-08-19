"use client";

import React from 'react';
import {useFormatter} from "next-intl";
import {Card, Chip} from "@heroui/react";
import {FiArrowDown, FiArrowUp} from "react-icons/fi";

type StatCardProps = {
  title: string;
  currentAmount: number;
  /**
   * The baseline to compare against, or `null` when none can be computed yet (every candidate period
   * predates the user's first record). Null renders a neutral "–" chip rather than a direction,
   * because there is nothing to be up or down against.
   */
  previousAmount: number | null;
  isHigherBetter?: boolean;
};

export default function StatCard({title, currentAmount, previousAmount, isHigherBetter = false}: StatCardProps) {
  const format = useFormatter();
  const hasBaseline = previousAmount !== null;
  const change = hasBaseline ? currentAmount - previousAmount : 0;
  const isIncrease = change >= 0;
  // Whether the movement is bad news depends on the metric: for income/net a drop is bad, for
  // expense a rise is bad. With no baseline there is no news at all, so stay neutral.
  const isBad = isHigherBetter ? change < 0 : change > 0;
  const color = !hasBaseline ? "default" : isBad ? "danger" : "success";
  // Percent change is only meaningful against a non-zero, finite baseline (a from-zero jump or a net
  // that crossed sign has no honest percentage) — fall back to a dash then.
  const pctChange = hasBaseline && previousAmount !== 0 ? (change / Math.abs(previousAmount)) * 100 : NaN;
  const hasPct = Number.isFinite(pctChange);

  return (
    // Tighter padding and gap below sm: the dashboard KPI strip keeps three cards across even on a
    // phone, which leaves each one ~114px wide in a single 6rem grid row, and HeroUI's defaults
    // (p-4 + gap-3) spend 44 of those 96 vertical pixels on whitespace.
    <Card className="flex h-full flex-col gap-1 p-2 sm:gap-3 sm:p-4">
      <Card.Header>
        <Card.Title className="text-muted">{title}</Card.Title>
      </Card.Header>
      {/* Stacks below sm so three of these still fit across a phone (the dashboard KPI row keeps its
          three columns at every width — see DashboardKpis). */}
      <Card.Content className="flex flex-1 flex-col items-start justify-center gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        {/* w-full + truncate so an unusually long amount ellipsizes instead of bleeding into the
            card's padding (the card clips, so it would otherwise sit flush against the border). */}
        <span className="w-full truncate text-sm font-bold tabular-nums sm:text-2xl">
          {format.number(currentAmount, "currency")}
        </span>
        <Chip variant="soft" color={color} size="sm" className="h-fit">
          {hasBaseline ? isIncrease ? <FiArrowUp/> : <FiArrowDown/> : null}
          <Chip.Label>{hasPct ? `${Math.abs(pctChange).toFixed(1)}%` : "–"}</Chip.Label>
        </Chip>
      </Card.Content>
    </Card>
  );
}