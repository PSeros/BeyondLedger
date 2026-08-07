"use client";

import {startTransition, useEffect, useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {addDays, addMonths, utcDate} from "@/features/expense/shared/db/cumulativeChart";

type Granularity = "1W" | "1M" | "1Y";

function readOffset(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

// Drives the chart period navigator (?co=<int>). The offset is "N periods back/forward" in the
// currently-selected granularity's own unit — the server emits every granularity's series shifted by
// N of its unit. Because the same integer means a different span per unit, the consumer resets the
// offset when the user switches 1W/1M/1Y (so "−4 months" doesn't silently become "−4 years").
//
// The offset is held in local state (source of truth for the label) and mirrored to the URL for the
// server refetch. Splitting them keeps the label instant: a granularity switch updates the label from
// client state in the same batched render, while the ?co write (and the chart data it refetches) can
// lag behind under Suspense without the label flashing the stale period.
export function useChartPeriodOffset(granularity: Granularity) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const t = useTranslations("periodNavigator");

  const urlOffset = readOffset(searchParams.get("co"));
  const [offset, setOffset] = useState(urlOffset);
  // Reconcile with the URL when it changes from outside this hook (back/forward, deep link).
  useEffect(() => {
    setOffset(urlOffset);
  }, [urlOffset]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let label: string;
  if (granularity === "1W") {
    const anchor = addDays(today, offset * 7);
    const weekStart = addDays(anchor, -((anchor.getUTCDay() + 6) % 7));
    label = t("weekOf", {date: format.dateTime(weekStart, {day: "numeric", month: "short", timeZone: "UTC"})});
  } else if (granularity === "1Y") {
    const anchor = utcDate(today.getUTCFullYear() + offset, 0, 1);
    label = format.dateTime(anchor, {year: "numeric", timeZone: "UTC"});
  } else {
    const anchor = addMonths(today, offset);
    label = format.dateTime(anchor, {month: "long", year: "numeric", timeZone: "UTC"});
  }

  function commit(next: number) {
    setOffset(next); // instant: the label reflects the new period this render
    const params = new URLSearchParams(searchParams.toString());
    if (next !== 0) {
      params.set("co", String(next));
    } else {
      params.delete("co");
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return {
    label,
    isCurrent: offset === 0,
    step: (delta: -1 | 1) => commit(offset + delta),
    reset: () => commit(0),
  };
}
