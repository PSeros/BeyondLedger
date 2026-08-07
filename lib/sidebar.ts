// Cookie holding the sidebar collapsed/expanded preference (values "1"/"0"). It's a pure-UI toggle —
// not in the DB, no server action, no tree revalidation. The server layout reads it to make the rail
// width SSR-stable (no flash); the client Sidebar writes it on toggle.
//
// This lives in a plain (non-"use client") module on purpose: a Server Component that imports a value
// from a "use client" file receives a client-reference stub, not the actual value, so the shared
// constant must be defined server-safely here.
export const SIDEBAR_COLLAPSED_COOKIE = "sidebar_collapsed";
