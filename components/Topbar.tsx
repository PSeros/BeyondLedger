"use client"

import React from 'react';
import {useTranslations} from "next-intl";
import ThemeChanger from "@/components/ThemeChanger";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import {getActiveRoute} from "@/lib/routes";
import {usePathname} from "next/navigation";
import type {WorkspaceOption} from "@/features/workspaces/types";

export default function Topbar({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: number | null;
}) {
  const pathname = usePathname()
  const currentRoute = getActiveRoute(pathname)
  const t = useTranslations("nav")

  const rightSide = (
    <div className="flex items-center gap-3">
      <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId}/>
      <ThemeChanger/>
    </div>
  );

  if (!currentRoute) {
    return (
      <div className="m-4 flex shrink-0 justify-between">
        <div className="text-2xl font-medium">{t("unknownRoute", {pathname})}</div>

        {rightSide}
      </div>
    );
  }

  const Icon = currentRoute.icon;

  return (
    <div className="m-4 flex shrink-0 justify-between">
      <div className="flex flex-row items-center gap-3">
        <Icon className="size-6"/>
        <span className="text-2xl font-medium">{t(currentRoute.key)}</span>
      </div>

      {rightSide}
    </div>
  );
}
