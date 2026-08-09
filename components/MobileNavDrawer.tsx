"use client"

import React, {useEffect, useState} from "react";
import {usePathname} from "next/navigation";
import {useTranslations} from "next-intl";
import {Button, Drawer} from "@heroui/react";
import {LuMenu} from "react-icons/lu";
import SidebarNav from "@/components/SidebarNav";
import type {WorkspaceOption} from "@/features/workspaces/types";

// Below lg the desktop rail is display:none (see app/(app)/layout.tsx) and this takes over. The
// component owns BOTH the hamburger and the overlay, so the open state stays local — nothing outside
// needs to toggle it, which is why there's no context provider wrapping the (app) subtree.
export default function MobileNavDrawer({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: number | null;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close on navigation. Covers nav-button presses, browser back/forward, and any link inside the
  // drawer; SidebarNav's onNavigate below only makes the close feel instant instead of waiting for
  // the RSC hop to land. Switching workspace does not change the pathname, so the drawer correctly
  // stays open and the user sees the switcher update in place.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Resizing/rotating past lg reveals the desktop rail. A drawer left open there would keep its focus
  // trap and scroll lock alive with nothing visible to dismiss, so close it. (Hiding the backdrop with
  // a lg:hidden class would not do — that hides it while leaving both still active.)
  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");
    const closeIfDesktop = () => {
      if (query.matches) setIsOpen(false);
    };
    query.addEventListener("change", closeIfDesktop);
    return () => query.removeEventListener("change", closeIfDesktop);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        isIconOnly
        aria-label={t("openMenu")}
        className="shrink-0 lg:hidden"
        onPress={() => setIsOpen(true)}
      >
        <LuMenu className="size-5"/>
      </Button>

      {/* Backdrop used standalone, without Drawer.Root: the trigger lives above, and Drawer.Backdrop
          is a react-aria-components ModalOverlay, which creates and provides the overlay state itself
          when used this way — the same pattern as components/DetailModal. It also renders null during
          SSR (useIsSSR), so no drawer markup reaches the initial HTML. */}
      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen} variant="opaque">
        <Drawer.Content placement="left">
          {/* Overrides the stock left-placement w-96/p-6. */}
          <Drawer.Dialog aria-label={t("menu")} className="w-64 max-w-[80vw] gap-2 p-2">
            <SidebarNav
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              collapsed={false}
              onNavigate={() => setIsOpen(false)}
            />
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
