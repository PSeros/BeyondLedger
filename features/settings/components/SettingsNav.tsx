"use client";

import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import {Button} from "@heroui/react";
import {getActiveSettingsSection, settingsSections} from "@/features/settings/nav";

// Vertical settings nav — the second-level rail that sits beside the settings content at lg+.
// Button conventions match components/SidebarNav so the two nav levels read as one system; below
// lg the layout hides this and renders SettingsNavTabs instead.
export default function SettingsNav({className}: {className?: string}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("settings.nav");

  const active = getActiveSettingsSection(pathname);

  return (
    <nav
      aria-label={t("label")}
      className={["w-52 shrink-0 flex-col gap-1", className].filter(Boolean).join(" ")}
    >
      {settingsSections.map((section) => {
        const Icon = section.icon;
        const isActive = active?.key === section.key;
        return (
          <Button
            key={section.key}
            variant={isActive ? "tertiary" : "ghost"}
            onPress={() => router.push(section.href)}
            className="w-full justify-start"
          >
            <Icon/>
            <span>{t(section.key)}</span>
          </Button>
        );
      })}
    </nav>
  );
}
