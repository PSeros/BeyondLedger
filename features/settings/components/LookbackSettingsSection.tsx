"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, TextField} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {updateLookback} from "@/features/settings/db/appSettingsMutations";
import {
  MAX_LOOKBACK_MONTHS,
  MAX_LOOKBACK_WEEKS,
  MAX_LOOKBACK_YEARS,
} from "@/features/settings/lookback";
import {SectionCard} from "@/features/settings/components/SectionCard";

// Edit surface for the Ø-baseline lookback: how many preceding periods the average line on every
// chart — and the dashboard's comparison chips — are measured against, tuned separately per
// granularity because "the last 8 weeks" and "the last 8 years" are very different asks of the data.
// Form-shaped (edit-then-Save) like WindowSettingsSection; the three values share one Save because
// they are one conceptual preference. Inputs are guarded to 1..max, and the server action validates
// again and throws on anything else.
//
// Worth knowing when reading the hints: these are ceilings only. Periods older than the first record
// are dropped from the average rather than counted as zeros, so raising a value never dilutes the
// baseline with history the user does not have.
export default function LookbackSettingsSection({
  lookbackWeeks,
  lookbackMonths,
  lookbackYears,
}: {
  lookbackWeeks: number;
  lookbackMonths: number;
  lookbackYears: number;
}) {
  const router = useRouter();
  const t = useTranslations("settings.lookback");
  const tCommon = useTranslations("common");

  const [weeks, setWeeks] = useState(String(lookbackWeeks));
  const [months, setMonths] = useState(String(lookbackMonths));
  const [years, setYears] = useState(String(lookbackYears));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isValid = (value: string, max: number) => {
    const n = Number(value);
    return value.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= max;
  };
  const canSave =
    isValid(weeks, MAX_LOOKBACK_WEEKS) &&
    isValid(months, MAX_LOOKBACK_MONTHS) &&
    isValid(years, MAX_LOOKBACK_YEARS);

  async function onSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateLookback({weeks: Number(weeks), months: Number(months), years: Number(years)});
      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t("couldNotSave"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField value={weeks} onChange={setWeeks} aria-label={t("weeksLabel")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("weeksLabel")}</Label>
          <Input type="number" step="1" min="1" max={MAX_LOOKBACK_WEEKS} inputMode="numeric"/>
          <p className="text-xs text-muted">{t("weeksHint")}</p>
        </TextField>

        <TextField value={months} onChange={setMonths} aria-label={t("monthsLabel")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("monthsLabel")}</Label>
          <Input type="number" step="1" min="1" max={MAX_LOOKBACK_MONTHS} inputMode="numeric"/>
          <p className="text-xs text-muted">{t("monthsHint")}</p>
        </TextField>

        <TextField value={years} onChange={setYears} aria-label={t("yearsLabel")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("yearsLabel")}</Label>
          <Input type="number" step="1" min="1" max={MAX_LOOKBACK_YEARS} inputMode="numeric"/>
          <p className="text-xs text-muted">{t("yearsHint")}</p>
        </TextField>
      </div>

      <p className="text-xs text-muted">{t("horizonNote")}</p>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-success">{t("saved")}</p> : null}

      <div>
        <Button type="button" size="sm" variant="primary" isDisabled={busy || !canSave} onPress={onSave}>
          {tCommon("save")}
        </Button>
      </div>
    </SectionCard>
  );
}
