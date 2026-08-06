"use client";

import {startTransition} from "react";
import {useFormatter} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import PeriodNavigator from "@/components/PeriodNavigator";
import {monthKey, parseMonthAnchor} from "@/features/budget/period";

// Budget page period navigator: a single shared MONTH anchor carried in ?at=YYYY-MM. Each budget card
// resolves the period *containing* this month against its own periodType, so stepping the anchor moves
// a monthly card by a month, a quarterly card by a quarter boundary, a yearly card only across a year,
// and leaves RANGE/OPEN untouched. Mirrors BudgetSearchField's ?q URL-write pattern.
export default function BudgetPeriodNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = useFormatter();

  const atParam = searchParams.get("at");
  const anchor = parseMonthAnchor(atParam);
  const currentKey = monthKey(new Date());
  const isCurrent = monthKey(anchor) === currentKey;

  const label = format.dateTime(anchor, {month: "long", year: "numeric", timeZone: "UTC"});

  function pushKey(nextKey: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    // Drop the param on the current month so the URL stays clean when nothing is being navigated.
    if (nextKey && nextKey !== currentKey) {
      params.set("at", nextKey);
    } else {
      params.delete("at");
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  function step(delta: -1 | 1) {
    const next = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + delta, 1));
    pushKey(monthKey(next));
  }

  return <PeriodNavigator label={label} isCurrent={isCurrent} onStep={step} onReset={() => pushKey(null)}/>;
}
