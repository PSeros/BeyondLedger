import {getTranslations} from "next-intl/server";
import {getAppSettings} from "@/features/settings/db/appSettings";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import AppearanceSettingsSection from "@/features/settings/components/AppearanceSettingsSection";
import LocaleSettingsSection from "@/features/settings/components/LocaleSettingsSection";
import WindowSettingsSection from "@/features/settings/components/WindowSettingsSection";

// App-wide preferences: language, theme, and the dashboard reminder windows.
export default async function Page() {
  const [t, appSettings] = await Promise.all([getTranslations("settings"), getAppSettings()]);

  return (
    <div className="max-w-2xl space-y-8">
      <SettingsSection id="language" heading={t("languageHeading")} description={t("languageDescription")}>
        <LocaleSettingsSection locale={appSettings.locale}/>
      </SettingsSection>

      <SettingsSection
        id="appearance"
        heading={t("appearance.heading")}
        description={t("appearance.headingDescription")}
      >
        <AppearanceSettingsSection/>
      </SettingsSection>

      <SettingsSection
        id="windows"
        heading={t("windows.heading")}
        description={t("windows.headingDescription")}
      >
        <WindowSettingsSection
          warrantyWarnDays={appSettings.warrantyWarnDays}
          upcomingWindowDays={appSettings.upcomingWindowDays}
        />
      </SettingsSection>
    </div>
  );
}
