"use client";

import {startTransition, useEffect, useMemo, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {parseInsightsQuery} from "@/features/insights/params";

// The Insights URL state, held locally too so rapid clicks (e.g. cycling a tri-state filter) build on
// the latest value instead of a URL the server render hasn't caught up with yet.
export function useInsightsParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlString = searchParams.toString();

  const [paramString, setParamString] = useState(urlString);
  useEffect(() => {
    setParamString(urlString);
  }, [urlString]);

  const query = useMemo(() => parseInsightsQuery(new URLSearchParams(paramString)), [paramString]);

  // `null` / "" deletes a key.
  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(paramString);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const next = params.toString();
    if (next === paramString) return;
    setParamString(next);
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, {scroll: false});
    });
  }

  return {query, update};
}
