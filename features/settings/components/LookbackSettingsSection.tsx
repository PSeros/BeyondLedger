"use client";

import {type Key, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, ListBox, Select, TextField} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {updateBaseline} from "@/features/settings/db/appSettingsMutations";
import {
  type BaselineMetric,
  MAX_LOOKBACK_MONTHS,
  MAX_LOOKBACK_WEEKS,
  MAX_LOOKBACK_YEARS,
  normalizeBaselineMetric,
} from "@/features/settings/lookback";
import {SectionCard} from "@/features/settings/components/SectionCard";

// Edit surface for the Ø baseline the charts and dashboard chips compare against: which statistic
// reduces the samples, and how many preceding periods to sample per granularity. Form-shaped
// (edit-then-Save) like WindowSettingsSection — one Save, because it is one preference. The lookback
// values are ceilings only; periods older than the first record are dropped, never counted as zeros.
export default function LookbackSettingsSection({
  lookbackWeeks,
  lookbackMonths,
  lookbackYears,
  baselineMetric,
}: {
  lookbackWeeks: number;
  lookbackMonths: number;
  lookbackYears: number;
  baselineMetric: BaselineMetric;
}) {
  const router = useRouter();
  const t = useTranslations("settings.lookback");
  const tCommon = useTranslations("common");

  const [weeks, setWeeks] = useState(String(lookbackWeeks));
  const [months, setMonths] = useState(String(lookbackMonths));
  const [years, setYears] = useState(String(lookbackYears));
  const [metric, setMetric] = useState<BaselineMetric>(baselineMetric);
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
      await updateBaseline({weeks: Number(weeks), months: Number(months), years: Number(years), metric});
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
      <Select
        value={metric}
        onChange={(key: Key | null) => key != null && setMetric(normalizeBaselineMetric(String(key)))}
        aria-label={t("metricLabel")}
        className="flex max-w-xs flex-col gap-1"
      >
        <Label className={labelClass}>{t("metricLabel")}</Label>
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="MEDIAN" textValue={t("metricMedian")}>{t("metricMedian")}</ListBox.Item>
            <ListBox.Item id="MEAN" textValue={t("metricMean")}>{t("metricMean")}</ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      <p className="text-xs text-muted">{metric === "MEDIAN" ? t("metricMedianHint") : t("metricMeanHint")}</p>

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
