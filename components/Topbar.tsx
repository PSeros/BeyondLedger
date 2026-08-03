"use client"

import React from 'react';
import {useTranslations} from "next-intl";
import ThemeChanger from "@/components/ThemeChanger";
import {getActiveRoute} from "@/lib/routes";
import {usePathname} from "next/navigation";

export default function Topbar() {
  const pathname = usePathname()
  const currentRoute = getActiveRoute(pathname)
  const t = useTranslations("nav")

  if (!currentRoute) {
    return (
      <div className="m-4 flex shrink-0 justify-between">
        <div className="text-2xl font-medium">{t("unknownRoute", {pathname})}</div>

        <ThemeChanger/>
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

      <ThemeChanger/>
    </div>
  );
}
