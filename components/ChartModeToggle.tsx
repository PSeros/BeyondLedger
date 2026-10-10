"use client";

import {useTranslations} from "next-intl";
import {Button, Tooltip} from "@heroui/react";
import {LuChartArea, LuChartColumn} from "react-icons/lu";
import {useChartMode} from "@/hooks/useChartMode";

// One icon button flipping the chart between a running total and each interval on its own (?cm).
// Shows the icon of the view it switches TO, so it reads as an action rather than a status.
export default function ChartModeToggle({className}: {className?: string}) {
  const t = useTranslations("chart");
  const {mode, select} = useChartMode();

  const toCumulative = mode === "discrete";
  const label = t(toCumulative ? "showCumulative" : "showDiscrete");

  return (
    <Tooltip delay={300}>
      <Button
        variant="tertiary"
        size="sm"
        isIconOnly
        aria-label={label}
        className={className}
        onPress={() => select(toCumulative ? "cumulative" : "discrete")}
      >
        {toCumulative ? <LuChartArea className="size-4"/> : <LuChartColumn className="size-4"/>}
      </Button>
      <Tooltip.Content placement="top">{label}</Tooltip.Content>
    </Tooltip>
  );
}
