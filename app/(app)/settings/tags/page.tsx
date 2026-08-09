import {getTranslations} from "next-intl/server";
import {getTagsAndWorkspaces} from "@/features/settings/db/referenceData";
import {SettingsSection} from "@/features/settings/components/SettingsSection";
import TagSection from "@/features/settings/components/reference/TagSection";
import WorkspaceSection from "@/features/settings/components/reference/WorkspaceSection";

// Accounts (workspaces) and tags — the two ways entries get grouped across the app.
export default async function Page() {
  const [t, data] = await Promise.all([getTranslations("settings"), getTagsAndWorkspaces()]);

  return (
    <SettingsSection heading={t("tagsHeading")} description={t("tagsDescription")}>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <WorkspaceSection id="accounts" workspaces={data.workspaces}/>
        <TagSection id="tags" tags={data.tags}/>
      </div>
    </SettingsSection>
  );
}
