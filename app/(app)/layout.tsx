import React from "react"
import {cookies} from "next/headers";
import Sidebar from "@/components/Sidebar";
import {SIDEBAR_COLLAPSED_COOKIE} from "@/lib/sidebar";
import Topbar from "@/components/Topbar";
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
      <aside className="w-fit text-center">
        <Sidebar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          initialCollapsed={initialCollapsed}
        />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col border-l border-separator">
        <Topbar/>
        <main className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="mx-auto h-full min-h-0 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
