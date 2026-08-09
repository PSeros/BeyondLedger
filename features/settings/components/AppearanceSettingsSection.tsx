"use client";

import {useTranslations} from "next-intl";
import {Label} from "@heroui/react";
import ThemeChanger from "@/components/ThemeChanger";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {SectionCard} from "@/features/settings/components/SectionCard";

// Theme picker on /settings/general. Reuses the Topbar's ThemeChanger as-is — the control also
// stays in the Topbar; this is the copy people find when they go looking in Settings. Theme is a
// client/next-themes concern (localStorage), unlike locale, which is persisted server-side.
export default function AppearanceSettingsSection() {
  const t = useTranslations("theme");
  return (
    <SectionCard>
      <div className="flex flex-col gap-1">
        <Label className={labelClass}>{t("selection")}</Label>
        <ThemeChanger/>
      </div>
    </SectionCard>
  );
}
