"use client";

import React from 'react';
import {useFormatter} from "next-intl";
import {Card, Chip} from "@heroui/react";
import {FiArrowDown, FiArrowUp} from "react-icons/fi";

type StatCardProps = {
  title: string;
  currentAmount: number;
  previousAmount: number;
  isHigherBetter?: boolean;
};

export default function StatCard({title, currentAmount, previousAmount, isHigherBetter = false}: StatCardProps) {
  const format = useFormatter();
  const change = currentAmount - previousAmount;
  const isIncrease = change >= 0;
  // Whether the movement is bad news depends on the metric: for income/net a drop is bad, for
  // expense a rise is bad.
  const isBad = isHigherBetter ? change < 0 : change > 0;
  const color = isBad ? "danger" : "success";
  // Percent change is only meaningful against a non-zero, finite baseline (a from-zero jump or a net
  // that crossed sign has no honest percentage) — fall back to a dash then.
  const pctChange = previousAmount !== 0 ? (change / Math.abs(previousAmount)) * 100 : NaN;
  const hasPct = Number.isFinite(pctChange);

  return (
    <Card className="flex h-full flex-col">
      <Card.Header>
        <Card.Title className="text-muted">{title}</Card.Title>
      </Card.Header>
      {/* Stacks below sm so three of these still fit across a phone (the dashboard KPI row keeps its
          three columns at every width — see DashboardKpis). */}
      <Card.Content className="flex flex-1 flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <span className="text-lg font-bold tabular-nums sm:text-2xl">{format.number(currentAmount, "currency")}</span>
        <Chip variant="soft" color={color} size="sm" className="h-fit">
          {isIncrease ? <FiArrowUp/> : <FiArrowDown/>}
          <Chip.Label>{hasPct ? `${Math.abs(pctChange).toFixed(1)}%` : "–"}</Chip.Label>
        </Chip>
      </Card.Content>
    </Card>
  );
}