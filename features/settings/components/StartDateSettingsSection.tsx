"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, TextField} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {updateStartDate} from "@/features/settings/db/appSettingsMutations";
import {SectionCard} from "@/features/settings/components/SectionCard";

// The app-wide calculation start. Empty = from the first record.
export default function StartDateSettingsSection({startDate}: {startDate: string | null}) {
  const router = useRouter();
  const t = useTranslations("settings.start");
  const tCommon = useTranslations("common");
  const [value, setValue] = useState(startDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(next: string) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateStartDate(next || null);
      setValue(next);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("couldNotSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard>
      <TextField value={value} onChange={setValue} aria-label={t("label")} className="flex max-w-xs flex-col gap-1">
        <Label className={labelClass}>{t("label")}</Label>
        <Input type="date" max={new Date().toISOString().slice(0, 10)}/>
        <p className="text-xs text-muted">{value ? t("hint") : t("hintEmpty")}</p>
      </TextField>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-success">{t("saved")}</p> : null}

      <div className="flex gap-2">
        <Button type="button" size="sm" variant="primary" isDisabled={busy || value === (startDate ?? "")} onPress={() => save(value)}>
          {tCommon("save")}
        </Button>
        {startDate ? (
          <Button type="button" size="sm" variant="tertiary" isDisabled={busy} onPress={() => save("")}>
            {t("clear")}
          </Button>
        ) : null}
      </div>
    </SectionCard>
  );
}
