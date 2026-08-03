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
  const change = previousAmount - currentAmount
  const pctChange = 100 / previousAmount * change;
  const isDecrease = change < 0;
  const isBad = isDecrease === isHigherBetter;
  const color = isBad ? "danger" : "success";

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-muted">{title}</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-row justify-between items-center w-3xs">
        <span className="text-2xl font-bold">{format.number(currentAmount, "currency")}</span>
        <Chip variant="soft" color={color} size="sm" className="h-fit">
          {isDecrease ? <FiArrowDown/> : <FiArrowUp/>}
          <Chip.Label>{pctChange.toFixed(2)}%</Chip.Label>
        </Chip>
      </Card.Content>
    </Card>
  );
}