"use client"

import React from 'react';
import {useTranslations} from "next-intl";
import ThemeChanger from "@/components/ThemeChanger";
import {getActiveRoute} from "@/lib/routes";
import {usePathname} from "next/navigation";

export default function Topbar({
  nav,
}: {
  // Slot for the mobile nav trigger (components/MobileNavDrawer, hidden at lg+). Passed as an element
  // from the server layout, which already has the workspace data, so Topbar stays workspace-agnostic.
  nav?: React.ReactNode;
}) {
  const pathname = usePathname()
  const currentRoute = getActiveRoute(pathname)
  const t = useTranslations("nav")

  const rightSide = (
    <div className="flex shrink-0 items-center gap-3">
      <ThemeChanger/>
    </div>
  );

  if (!currentRoute) {
    return (
      <div className="m-4 flex shrink-0 justify-between gap-3">
        <div className="flex min-w-0 flex-row items-center gap-3">
          {nav}
          <span className="truncate text-xl font-medium sm:text-2xl">
            {t("unknownRoute", {pathname})}
          </span>
        </div>

        {rightSide}
      </div>
    );
  }

  const Icon = currentRoute.icon;

  return (
    <div className="m-4 flex shrink-0 justify-between gap-3">
      <div className="flex min-w-0 flex-row items-center gap-3">
        {nav}
        <Icon className="size-6 shrink-0"/>
        <span className="truncate text-xl font-medium sm:text-2xl">{t(currentRoute.key)}</span>
      </div>

      {rightSide}
    </div>
  );
}
