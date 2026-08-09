"use client";

import {type Key, useState, useTransition} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Label, ListBox, Select} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {updateLocale} from "@/features/settings/db/appSettingsMutations";
import {SectionCard} from "@/features/settings/components/SectionCard";

// Language / region picker. Locale is persisted in the AppSettings singleton (server-side) so it
// reaches Server Components (<html lang>, currency/date formatting, translated strings). Changing
// it runs the server action (which revalidates the whole tree) then refreshes so the new locale
// takes effect immediately.
export default function LocaleSettingsSection({locale}: {locale: string}) {
  const router = useRouter();
  const t = useTranslations("settings");
  const [current, setCurrent] = useState(locale);
  const [isPending, startTransition] = useTransition();

  function onChange(key: Key | null) {
    if (key == null) return;
    const next = String(key);
    setCurrent(next);
    startTransition(async () => {
      await updateLocale(next);
      router.refresh();
    });
  }

  return (
    <SectionCard>
      <Select
        value={current}
        onChange={onChange}
        isDisabled={isPending}
        aria-label={t("language")}
        className="flex max-w-xs flex-col gap-1"
      >
        <Label className={labelClass}>{t("language")}</Label>
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="en" textValue={t("english")}>{t("english")}</ListBox.Item>
            <ListBox.Item id="de" textValue={t("german")}>{t("german")}</ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </SectionCard>
  );
}
