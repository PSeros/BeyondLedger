import {getTranslations} from "next-intl/server";
import {getAppSettings} from "@/features/settings/db/appSettings";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import AppearanceSettingsSection from "@/features/settings/components/AppearanceSettingsSection";
import LocaleSettingsSection from "@/features/settings/components/LocaleSettingsSection";
import WindowSettingsSection from "@/features/settings/components/WindowSettingsSection";
import LookbackSettingsSection from "@/features/settings/components/LookbackSettingsSection";

// App-wide preferences: language, theme, the dashboard reminder windows, and the chart Ø lookback.
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

      <SettingsSection
        id="lookback"
        heading={t("lookback.heading")}
        description={t("lookback.headingDescription")}
      >
        <LookbackSettingsSection
          lookbackWeeks={appSettings.lookbackWeeks}
          lookbackMonths={appSettings.lookbackMonths}
          lookbackYears={appSettings.lookbackYears}
        />
      </SettingsSection>
    </div>
  );
}
