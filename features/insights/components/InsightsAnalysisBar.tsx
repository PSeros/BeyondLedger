"use client";

import {useTranslations} from "next-intl";
import {ListBox, Select} from "@heroui/react";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import {DEFAULT_STAT_UNIT} from "@/features/insights/params";
import {dimensionKey, dimensionsFor, unitKey, unitsFor} from "@/features/insights/labels";

// An inline-labelled select. HeroUI's Select stacks its Label above the trigger, so the label here
// is a plain span and the Select carries it as aria-label.
function InlineSelect<T extends string>({label, value, options, onChange}: {
  label: string;
  value: T;
  options: {id: T; name: string}[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <Select aria-label={label} value={value} onChange={(key) => key != null && onChange(String(key) as T)} className="w-44">
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {options.map((option) => (
              <ListBox.Item key={option.id} id={option.id} textValue={option.name}>
                {option.name}
                <ListBox.ItemIndicator/>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

// The two page-wide analysis settings, under the period and filters they sit beside: what one value
// is (?u — KPIs, statistics, spread, distribution) and how entries are grouped (?by — share and spread).
export default function InsightsAnalysisBar() {
  const t = useTranslations("insights");
  const {query, update} = useInsightsParams();


  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <InlineSelect
        label={t("unitLabel")}
        value={query.unit}
        options={unitsFor(query.domain).map((unit) => ({id: unit, name: t(unitKey(unit, query.domain))}))}
        onChange={(unit) => update({u: unit === DEFAULT_STAT_UNIT ? null : unit})}
      />
      <InlineSelect
        label={t("groupLabel")}
        value={query.by}
        options={dimensionsFor(query.domain).map((dimension) => ({id: dimension, name: t(dimensionKey(dimension, query.domain))}))}
        onChange={(by) => update({by: by === "category" ? null : by})}
      />
    </div>
  );
}
