"use client";

import {startTransition} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {addDays, addMonths, utcDate} from "@/features/expense/shared/db/cumulativeChart";

type Granularity = "1W" | "1M" | "1Y";

// Drives the chart period navigator (?co=<int>). The offset is "N periods back/forward" in the
// currently-selected granularity's own unit — the server emits every granularity's series shifted by
// N of its unit, so switching 1W/1M/1Y stays an instant client toggle while the same offset keeps its
// meaning. Returns the formatted label for the *current* granularity, whether we're on the current
// period (reveals the reset affordance), and step/reset writers mirroring BudgetSearchField's ?q.
export function useChartPeriodOffset(granularity: Granularity) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = useFormatter();
  const t = useTranslations("periodNavigator");

  const raw = Number(searchParams.get("co"));
  const offset = Number.isInteger(raw) ? raw : 0;

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

  function pushOffset(next: number) {
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
    step: (delta: -1 | 1) => pushOffset(offset + delta),
    reset: () => pushOffset(0),
  };
}
