"use client";

import React from 'react';
import {useTranslations} from "next-intl";
import {Chip} from "@heroui/react";
import {LuCircleAlert, LuCircleCheck, LuCircleX} from "react-icons/lu";
import type {LifecycleStatus} from "@/lib/status";

type StatusChipProps = {
  status: LifecycleStatus;
};

export default function StatusChip({status}: StatusChipProps) {
  const t = useTranslations("status");
  const variant = "soft"
  const style = "w-20"

  const config = {
    Active: {
      color: "success",
      icon: <LuCircleCheck/>
    },
    Pending: {
      color: "warning",
      icon: <LuCircleAlert/>
    },
    Inactive: {
      color: "danger",
      icon: <LuCircleX/>
    }
  } as const;

  const current = config[status];

  return (
    <Chip variant={variant} color={current.color} className={style}>
      {current.icon}
      <Chip.Label>{t(status)}</Chip.Label>
    </Chip>
  );
}
