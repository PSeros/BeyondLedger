"use client"

import React, {useState, useTransition} from 'react';
import type {Selection} from "react-aria-components";
import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import {isActiveRoute, routes} from "@/lib/routes";
import {Avatar, Button, Dropdown, Label, Tooltip} from "@heroui/react";
import {FaChevronDown, FaLayerGroup} from "react-icons/fa6";
import {setActiveWorkspace} from "@/features/settings/db/appSettingsMutations";
import type {WorkspaceOption} from "@/features/workspaces/types";

// The account (Workspace) switcher lives in the sidebar header. The active account is persisted
// in the AppSettings singleton, so it's a "which account am I looking at" mode that sticks across all
// navigation. Selecting one runs the server action (which revalidates the whole tree) then refreshes
// so every list/chart updates immediately. The "all" sentinel maps to null = "All accounts" (no filter).
const ALL = "all";

/**
 * The switcher + route buttons, shared by the desktop rail (components/Sidebar) and the mobile
 * drawer (components/MobileNavDrawer). Renders a fragment, not a container — each parent supplies
 * its own box, since the rail is a fixed-width column and the drawer is a dialog.
 */
export default function SidebarNav({
  workspaces,
  activeWorkspaceId,
  collapsed,
  onNavigate,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: number | null;
  /** Icon-only rail mode: hides labels and surfaces them on hover via Tooltip. Always false in the drawer. */
  collapsed: boolean;
  /** Called after a route push so the drawer can close itself without waiting on the RSC hop. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations("nav")
  const tw = useTranslations("workspaces")

  const [current, setCurrent] = useState(activeWorkspaceId != null ? String(activeWorkspaceId) : ALL);
  const [isPending, startTransition] = useTransition();

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

  return (
    <>
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
              onPress={() => {
                router.push(route.href);
                onNavigate?.();
              }}
              aria-label={collapsed ? label : undefined}
              className={`w-full ${collapsed ? "justify-center" : "justify-start"}`}>
              <Icon/>
              {!collapsed && <span>{label}</span>}
            </Button>
          );

          // When collapsed the label text is hidden, so surface it on hover via a Tooltip. Expanded
          // rows already show the label, so render the button bare to avoid an unnecessary wrapper.
          // The drawer always passes collapsed={false}, so hover-only tooltips never reach touch.
          return collapsed ? (
            <Tooltip key={route.href} delay={300}>
              {button}
              <Tooltip.Content placement="right">{label}</Tooltip.Content>
            </Tooltip>
          ) : button;
        })}
      </div>
    </>
  );
}
