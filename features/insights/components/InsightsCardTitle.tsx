"use client";

import {Tooltip} from "@heroui/react";
import {LuInfo} from "react-icons/lu";

// A card title whose explanation only shows on hover / focus, behind a small info icon.
export default function InsightsCardTitle({title, info}: {title: string; info?: string}) {
  if (!info) return <p className="text-sm">{title}</p>;
  return (
    <Tooltip delay={200}>
      <Tooltip.Trigger className="flex w-fit cursor-help items-center gap-1.5 rounded text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
        {title}
        <LuInfo className="size-3.5 text-muted" aria-hidden/>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top start" className="max-w-xs">{info}</Tooltip.Content>
    </Tooltip>
  );
}
