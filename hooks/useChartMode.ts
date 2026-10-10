"use client";

import {startTransition, useEffect, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {type ChartMode, parseChartMode} from "@/features/expense/shared/db/cumulativeChart";

// Drives the chart's shape toggle (?cm=cum|sum): a running total across the period, or each bucket
// on its own. It lives in the URL rather than client state because the discrete series has to be
// built on the server — differencing the cumulative one gives the right `current` but the wrong Ø
// line, since the median of differences is not the difference of medians.
//
// Local state is the source of truth for the button so the press registers immediately, while the
// ?cm write (and the refetch it triggers) can lag behind under Suspense. Mirrors useChartPeriodOffset.
export function useChartMode() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlMode = parseChartMode(searchParams.get("cm"));
  const [mode, setMode] = useState<ChartMode>(urlMode);
  useEffect(() => {
    setMode(urlMode);
  }, [urlMode]);

  function select(next: ChartMode) {
    if (next === mode) return;
    setMode(next);

    const params = new URLSearchParams(searchParams);
    if (next === "cumulative") params.delete("cm");
    else params.set("cm", "sum");

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {scroll: false});
    });
  }

  return {mode, select};
}
