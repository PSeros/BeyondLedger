import React from "react"
import {cookies} from "next/headers";
import Sidebar from "@/components/Sidebar";
import {SIDEBAR_COLLAPSED_COOKIE} from "@/lib/sidebar";
import Topbar from "@/components/Topbar";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workspaces, activeWorkspaceId, cookieStore] = await Promise.all([
    getWorkspaces(),
    getActiveWorkspaceId(),
    cookies(),
  ]);
  // The collapsed preference is a pure-UI cookie (no DB / no tree revalidation). Reading it here and
  // passing the initial state down keeps the rail width SSR-stable, so there's no expanded-width flash.
  const initialCollapsed = cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1";

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* The rail is hidden below lg in pure CSS (MobileNavDrawer takes over there) rather than by a
          JS breakpoint check, so the SSR HTML is identical at every width — no flash, no hydration
          mismatch, and the collapsed cookie keeps driving the w-16/w-50 width unchanged. */}
      <aside className="hidden w-fit text-center lg:block">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          initialCollapsed={initialCollapsed}
        />
      </aside>

      {/* Border only at lg+ — below it there is nothing to the left, so it would be a stray 1px line
          down the edge of the screen. */}
      {/* min-w-0 is load-bearing: as a flex item this column keeps the default min-width:auto, i.e. it
          refuses to shrink below its content's min-content width. A wide table would push it past the
          viewport (and get clipped by the overflow-hidden shell) instead of letting the content scroll. */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:border-l lg:border-separator">
        <Topbar
          nav={<MobileNavDrawer workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}/>}
        />
        <main className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="mx-auto h-full min-h-0 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
