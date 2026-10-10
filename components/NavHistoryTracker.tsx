"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {recordLocation} from "@/lib/navHistory";

// Records every in-app route change into lib/navHistory, so BackLink on a detail page can return to
// wherever you came from. Mounted once in the (app) layout; renders nothing.
//
// Keyed on the pathname alone, reading window.location inside the effect instead of calling
// useSearchParams(): a search-param hook in the shared layout would opt this route group's whole
// client tree out of prerendering, and a param-only change never moves the trail anyway.
export default function NavHistoryTracker() {
  const pathname = usePathname();

  useEffect(() => {
    recordLocation(`${window.location.pathname}${window.location.search}`);
  }, [pathname]);

  return null;
}
