"use client"

import React, {useState, useTransition} from 'react';
import type {Selection} from "react-aria-components";
import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import {isActiveRoute, routes} from "@/lib/routes";
import {Avatar, Button, Dropdown, Label, Tooltip} from "@heroui/react";
import {FaAnglesLeft, FaAnglesRight, FaChevronDown, FaLayerGroup} from "react-icons/fa6";
import {setActiveWorkspace} from "@/features/settings/db/appSettingsMutations";
import {SIDEBAR_COLLAPSED_COOKIE} from "@/lib/sidebar";
import type {WorkspaceOption} from "@/features/workspaces/types";

// The account (Workspace) switcher lives here in the sidebar header. The active account is persisted
// in the AppSettings singleton, so it's a "which account am I looking at" mode that sticks across all
// navigation. Selecting one runs the server action (which revalidates the whole tree) then refreshes
// so every list/chart updates immediately. The "all" sentinel maps to null = "All accounts" (no filter).
const ALL = "all";

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
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("nav")
  const tw = useTranslations("workspaces")

  const [current, setCurrent] = useState(activeWorkspaceId != null ? String(activeWorkspaceId) : ALL);
  const [isPending, startTransition] = useTransition();

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const activeWorkspace = current !== ALL
    ? workspaces.find((w) => String(w.id) === current) ?? null
    : null;

  function onSelectionChange(keys: Selection) {
    if (keys === "all") return;
    const next = String([...keys][0] ?? ALL);
    if (next === current) return;
    setCurrent(next);
    startTransition(async () => {
      await setActiveWorkspace(next === ALL ? null : Number(next));
      router.refresh();
    });
  }

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
      <Dropdown>
        <Dropdown.Trigger
          isDisabled={isPending}
          aria-label={tw("switcherLabel")}
          className={`group mt-2.5 flex w-full items-center gap-2 rounded-lg p-1.5 text-left outline-none transition-colors hover:bg-default focus-visible:ring-2 focus-visible:ring-focus data-[disabled]:opacity-60 active:[transform:none]! data-[pressed]:[transform:none]! ${collapsed ? "justify-center" : ""}`}
        >
          {activeWorkspace ? (
            <Avatar
              size="md"
              style={{backgroundColor: activeWorkspace.color}}
              className="shrink-0 font-medium text-white"
            >
              {activeWorkspace.name.charAt(0).toUpperCase()}
            </Avatar>
          ) : (
            <Avatar size="md" className="shrink-0">
              <FaLayerGroup/>
            </Avatar>
          )}
          {!collapsed && (
            <>
              <Label className="min-w-0 flex-1 truncate cursor-pointer">
                {activeWorkspace ? activeWorkspace.name : tw("allAccounts")}
              </Label>
              <FaChevronDown className="shrink-0 text-muted transition-transform duration-200 group-aria-expanded:rotate-180"/>
            </>
          )}
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start" className="w-56">
          <Dropdown.Menu
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([current])}
            onSelectionChange={onSelectionChange}
            aria-label={tw("switcherLabel")}
          >
            <Dropdown.Item id={ALL} textValue={tw("allAccounts")}>
              <FaLayerGroup className="shrink-0 text-muted"/>
              {tw("allAccounts")}
              <Dropdown.ItemIndicator/>
            </Dropdown.Item>
            {workspaces.map((workspace) => (
              <Dropdown.Item key={workspace.id} id={String(workspace.id)} textValue={workspace.name}>
                <span className="size-2.5 shrink-0 rounded-full" style={{backgroundColor: workspace.color}}/>
                {workspace.name}
                <Dropdown.ItemIndicator/>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
      <div className="flex flex-col gap-2 w-full mt-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const isActive = isActiveRoute(pathname, route)
          const label = t(route.key)

          const button = (
            <Button
              key={route.href}
              variant={isActive ? "tertiary" : "ghost"}
              onPress={() => router.push(route.href)}
              aria-label={collapsed ? label : undefined}
              className={`w-full ${collapsed ? "justify-center" : "justify-start"}`}>
              <Icon/>
              {!collapsed && <span>{label}</span>}
            </Button>
          );

          // When collapsed the label text is hidden, so surface it on hover via a Tooltip. Expanded
          // rows already show the label, so render the button bare to avoid an unnecessary wrapper.
          return collapsed ? (
            <Tooltip key={route.href} delay={300}>
              {button}
              <Tooltip.Content placement="right">{label}</Tooltip.Content>
            </Tooltip>
          ) : button;
        })}
      </div>
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
