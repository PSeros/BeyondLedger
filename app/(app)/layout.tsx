import React from "react"
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workspaces, activeWorkspaceId] = await Promise.all([getWorkspaces(), getActiveWorkspaceId()]);

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <aside className="w-fit text-center">
        <Sidebar/>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col border-l border-separator">
        <Topbar workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}/>
        <main className="min-h-0 flex-1 overflow-hidden p-4">
          <div className="mx-auto h-full min-h-0 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
