import {redirect} from "next/navigation";
import {DEFAULT_SETTINGS_SECTION} from "@/features/settings/nav";

// /settings has no content of its own — it opens on the first section, mirroring /expense.
export default function SettingsPage() {
  return (redirect(DEFAULT_SETTINGS_SECTION.href));
}
