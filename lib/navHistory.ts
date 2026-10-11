// In-app navigation trail, kept in module scope: per tab, wiped by any hard load. It exists so a
// standalone detail page can go back to the page you actually came from (e.g. /budget) instead of a
// hardcoded link to its domain list (issue #2).
//
// NavHistoryTracker (mounted once in the (app) layout) fills it, BackLink reads it. On the server
// nothing ever records, so the trail is always empty there — which is what keeps BackLink's SSR
// output and its hydration render identical.

const MAX_ENTRIES = 10;

const trail: string[] = [];

function pathOf(href: string) {
  return href.split("?")[0];
}

export function recordLocation(href: string) {
  const last = trail[trail.length - 1];

  // A param-only change (filters, ?edit) is the same page, not a new stop on the trail — refresh the
  // entry in place so its href stays current.
  if (last != null && pathOf(last) === pathOf(href)) {
    trail[trail.length - 1] = href;
    return;
  }

  trail.push(href);
  if (trail.length > MAX_ENTRIES) {
    trail.shift();
  }
}

// The most recent entry that isn't the page asking. Scanning for it (instead of just taking the
// second-to-last entry) makes the result independent of whether the tracker's effect has already
// recorded the current page — effect order between the layout and the page is not ours to rely on.
export function getBackTarget(currentPathname: string) {
  for (let i = trail.length - 1; i >= 0; i--) {
    if (pathOf(trail[i]) !== currentPathname) {
      return trail[i];
    }
  }

  return null;
}

// Forget a page that no longer exists (e.g. a contract just converted into a saving), so a back link
// never leads to its 404. Pair it with router.replace so the browser history agrees.
export function forgetLocation(pathname: string) {
  for (let i = trail.length - 1; i >= 0; i--) {
    if (pathOf(trail[i]) === pathname) trail.splice(i, 1);
  }
}
