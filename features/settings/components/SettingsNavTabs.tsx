"use client";

import {useTranslations} from "next-intl";
import {usePathname, useRouter} from "next/navigation";
import {Tabs} from "@heroui/react";
import {DEFAULT_SETTINGS_SECTION, getActiveSettingsSection, settingsSections} from "@/features/settings/nav";

// The settings nav below lg, where the vertical rail would eat too much width. Same URL-driven
// Tabs pattern as components/VFSwitch; the row scrolls horizontally on narrow phones rather than
// squeezing five tabs into 320px.
export default function SettingsNavTabs({className}: {className?: string}) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("settings.nav");

  const selectedKey = (getActiveSettingsSection(pathname) ?? DEFAULT_SETTINGS_SECTION).key;

  return (
    <div className={["scrollbar-hide max-w-full overflow-x-auto", className].filter(Boolean).join(" ")}>
      <Tabs
        className="w-fit"
        selectedKey={selectedKey}
        onSelectionChange={(key) => router.push(`/settings/${key}`)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t("label")}>
            {settingsSections.map((section) => (
              <Tabs.Tab key={section.key} id={section.key}>
                {t(section.key)}
                <Tabs.Indicator/>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </div>
  );
}
