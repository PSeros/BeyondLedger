"use client";

import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useTranslations} from "next-intl";
import {LuArrowLeft} from "react-icons/lu";
import {getBackTarget} from "@/lib/navHistory";

type BackLinkProps = {
  // Where to go when there is no in-app trail (hard load, direct link, bookmark): the entity's
  // domain list, with its own specific label.
  fallbackHref: string;
  fallbackLabel: string;
};

// Back affordance for the standalone detail pages. It follows the navigation trail, so coming in
// from /budget or the dashboard goes back there rather than to the domain list (issue #2).
//
// The trail is client-only and empty on the server, so the first render — SSR and the hydration
// render alike — always yields the fallback; subsequent renders (i.e. any soft navigation into this
// page) see the real target. That's deliberate: no hydration mismatch, and no label flicker either.
export default function BackLink({fallbackHref, fallbackLabel}: BackLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("detail");

  const target = getBackTarget(pathname);
  // Coming straight from the domain list, the specific label is the better one.
  const isFallbackTarget = target == null || target.split("?")[0] === fallbackHref;

  return (
    <Link
      href={target ?? fallbackHref}
      prefetch={false}
      onClick={(event) => {
        if (target == null) return;
        // Let the browser handle modifier / middle clicks via the real href, so "open in new tab"
        // keeps working.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        // A plain click pops the history entry instead of pushing a new one: that restores the
        // previous URL in full (filters, period params) plus its scroll position.
        event.preventDefault();
        router.back();
      }}
      className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
    >
      <LuArrowLeft/>
      {isFallbackTarget ? fallbackLabel : t("back")}
    </Link>
  );
}
