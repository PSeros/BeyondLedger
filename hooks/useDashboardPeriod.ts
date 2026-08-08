"use client";

import {startTransition, useEffect, useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {
  addDays,
  addMonths,
  type Granularity,
  isoWeek,
  parseChartOffset,
  parseGranularity,
  utcDate,
} from "@/features/expense/shared/db/cumulativeChart";

// Owns the dashboard-wide period selection — granularity (?cg) + offset (?co) — that every
// period-scoped widget (chart, KPIs, donuts) reads on the server. Unlike useChartPeriodOffset (which
// only steps the offset for a single chart card and takes its granularity as an argument), this hook
// also drives the unit switch, and both live in one place so the period toolbar can graduate out of
// the chart card.
//
// Both values are held in local state (source of truth for the label + active button) and mirrored to
// the URL for the server refetch, so a click updates the toolbar instantly while the ?cg/?co write
// and its Suspense refetch can lag behind without the UI flashing a stale period. Switching the unit
// resets the offset to 0: ?co is expressed in the selected unit, so carrying "−4 months" into years
// would silently mean four years back.
export function useDashboardPeriod() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const t = useTranslations("periodNavigator");

  const urlGranularity = parseGranularity(searchParams.get("cg"));
  const urlOffset = parseChartOffset(searchParams.get("co"));
  const [granularity, setGranularity] = useState(urlGranularity);
  const [offset, setOffset] = useState(urlOffset);
  // Reconcile with the URL when it changes from outside this hook (back/forward, deep link).
  useEffect(() => {
    setGranularity(urlGranularity);
  }, [urlGranularity]);
  useEffect(() => {
    setOffset(urlOffset);
  }, [urlOffset]);

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  let label: string;
  if (granularity === "1W") {
    label = t("weekNumber", {week: isoWeek(addDays(today, offset * 7))});
  } else if (granularity === "1Y") {
    const anchor = utcDate(today.getUTCFullYear() + offset, 0, 1);
    label = format.dateTime(anchor, {year: "numeric", timeZone: "UTC"});
  } else {
    const anchor = addMonths(today, offset);
    label = format.dateTime(anchor, {month: "long", year: "numeric", timeZone: "UTC"});
  }

  function commit(nextGranularity: Granularity, nextOffset: number) {
    setGranularity(nextGranularity); // instant: label + active button reflect the new selection
    setOffset(nextOffset);
    const params = new URLSearchParams(searchParams.toString());
    if (nextGranularity !== "1M") {
      params.set("cg", nextGranularity);
    } else {
      params.delete("cg");
    }
    if (nextOffset !== 0) {
      params.set("co", String(nextOffset));
    } else {
      params.delete("co");
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return {
    granularity,
    label,
    isCurrent: offset === 0,
    // A unit switch resets the offset (see note above); re-selecting the active unit is a no-op.
    selectGranularity: (next: Granularity) => {
      if (next !== granularity) commit(next, 0);
    },
    step: (delta: -1 | 1) => commit(granularity, offset + delta),
    reset: () => commit(granularity, 0),
  };
}
