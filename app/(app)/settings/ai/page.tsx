import {getTranslations} from "next-intl/server";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import AiSettingsSection from "@/features/settings/components/AiSettingsSection";

// Provider config for the document-processing pipeline (Phase 8b).
export default async function Page() {
  const [t, aiSettings] = await Promise.all([getTranslations("settings"), getAiSettingsForm()]);

  return (
    <div className="max-w-2xl">
      <SettingsSection id="ai" heading={t("aiHeading")} description={t("aiHeadingDescription")}>
        <AiSettingsSection settings={aiSettings}/>
      </SettingsSection>
    </div>
  );
}
