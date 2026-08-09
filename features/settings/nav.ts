import {IconType} from "react-icons";
import {
  LuDatabase,
  LuHardDrive,
  LuRadioTower,
  LuSlidersHorizontal,
  LuSparkles,
  LuTags,
} from "react-icons/lu";

// The /settings sub-routes, in the order they appear in the settings nav. `key` indexes into the
// `settings.nav` message namespace (locales/*.json), so this config stays locale-agnostic —
// mirroring lib/routes.ts for the top-level nav.
//
// NEUTRAL MODULE (no "use client"): imported by both the Server Component layout and the client
// nav — a "use client" module would hand the Server Component a stub instead of the array.

// NOTE: `key` must equal the URL segment — SettingsNavTabs pushes `/settings/${key}`.
export type SettingsSectionKey = "general" | "data" | "tags" | "ai" | "integrations" | "backup";

export type SettingsSection = {
  key: SettingsSectionKey;
  href: string;
  icon: IconType;
};

export const settingsSections: SettingsSection[] = [
  {key: "general", href: "/settings/general", icon: LuSlidersHorizontal},
  {key: "data", href: "/settings/data", icon: LuDatabase},
  {key: "tags", href: "/settings/tags", icon: LuTags},
  {key: "ai", href: "/settings/ai", icon: LuSparkles},
  {key: "integrations", href: "/settings/integrations", icon: LuRadioTower},
  {key: "backup", href: "/settings/backup", icon: LuHardDrive},
];

export const DEFAULT_SETTINGS_SECTION = settingsSections[0];

export function getActiveSettingsSection(pathname: string): SettingsSection | undefined {
  return settingsSections.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`),
  );
}
