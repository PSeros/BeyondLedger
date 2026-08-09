"use client"

import React, {useState} from 'react';
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {FaAnglesLeft, FaAnglesRight} from "react-icons/fa6";
import SidebarNav from "@/components/SidebarNav";
import {SIDEBAR_COLLAPSED_COOKIE} from "@/lib/sidebar";
import type {WorkspaceOption} from "@/features/workspaces/types";

// The desktop rail. Hidden below lg by app/(app)/layout.tsx, where components/MobileNavDrawer takes
// over — so the collapse toggle below needs no breakpoint of its own.
//
// The collapsed/expanded preference is stored in the SIDEBAR_COLLAPSED_COOKIE cookie (values "1"/"0").
// Unlike the active account it is a pure-UI toggle, so it is NOT in the DB — no server action, no tree
// revalidation. The server layout reads it and passes `initialCollapsed` so the rail width is
// SSR-stable (no flash). The constant lives in lib/sidebar.ts so the server layout can import it too
// (importing it from this "use client" module would hand the server a client-reference stub, not the
// string).

export default function Sidebar({
  workspaces,
  activeWorkspaceId,
  initialCollapsed,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: number | null;
  initialCollapsed: boolean;
}) {
  const t = useTranslations("nav")

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  return (
    <div
      className={`flex h-full flex-col gap-2 mx-2 transition-[width] duration-200 ${collapsed ? "w-16" : "w-50"}`}
    >
      <SidebarNav
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        collapsed={collapsed}
      />
      <Button
        variant="ghost"
        onPress={toggleCollapsed}
        aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
        className={`mt-auto mb-2 w-full ${collapsed ? "justify-center" : "justify-start"}`}>
        {collapsed ? <FaAnglesRight/> : <FaAnglesLeft/>}
      </Button>
    </div>
  );
}
