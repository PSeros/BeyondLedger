"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, TextField} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {
  updateUpcomingWindowDays,
  updateWarrantyWarnDays,
} from "@/features/settings/db/appSettingsMutations";

// Edit surface for the dashboard reminder windows (Phase 12): the warranty-expiry alert window and
// the upcoming fixed-expense/income window, both in days. Form-shaped (edit-then-Save), mirroring
// AiSettingsSection. The two values are independent but share one Save. Inputs are guarded to a
// non-negative integer (matching the Frequency reference-data pattern); the server action validates
// again and throws on anything else.
export default function WindowSettingsSection({
  warrantyWarnDays,
  upcomingWindowDays,
}: {
  warrantyWarnDays: number;
  upcomingWindowDays: number;
}) {
  const router = useRouter();
  const t = useTranslations("settings.windows");
  const tCommon = useTranslations("common");

  const [warranty, setWarranty] = useState(String(warrantyWarnDays));
  const [upcoming, setUpcoming] = useState(String(upcomingWindowDays));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid = (value: string) => {
    const n = Number(value);
    return value.trim() !== "" && Number.isInteger(n) && n >= 0;
  };
  const canSave = isValid(warranty) && isValid(upcoming);

  async function onSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateWarrantyWarnDays(Number(warranty));
      await updateUpcomingWindowDays(Number(upcoming));
      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("couldNotSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-default bg-surface flex flex-col gap-4 rounded-[var(--radius)] border p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          value={warranty}
          onChange={setWarranty}
          aria-label={t("warrantyLabel")}
          className="flex flex-col gap-1"
        >
          <Label className={labelClass}>{t("warrantyLabel")}</Label>
          <Input type="number" step="1" min="0" inputMode="numeric"/>
          <p className="text-xs text-muted">{t("warrantyHint")}</p>
        </TextField>

        <TextField
          value={upcoming}
          onChange={setUpcoming}
          aria-label={t("upcomingLabel")}
          className="flex flex-col gap-1"
        >
          <Label className={labelClass}>{t("upcomingLabel")}</Label>
          <Input type="number" step="1" min="0" inputMode="numeric"/>
          <p className="text-xs text-muted">{t("upcomingHint")}</p>
        </TextField>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-success">{t("saved")}</p> : null}

      <div>
        <Button type="button" size="sm" variant="primary" isDisabled={busy || !canSave} onPress={onSave}>
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}
