import {getTranslations} from "next-intl/server";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import BackupSettingsSection from "@/features/settings/components/BackupSettingsSection";

// Download a full snapshot (DB + uploads) or restore one. Both go through /api/backup|restore.
export default async function Page() {
  const t = await getTranslations("settings.backup");

  return (
    <div className="max-w-2xl">
      <SettingsSection id="backup" heading={t("heading")} description={t("headingDescription")}>
        <BackupSettingsSection/>
      </SettingsSection>
    </div>
  );
}
