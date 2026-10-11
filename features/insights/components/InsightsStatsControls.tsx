"use client";

import type {Key, Selection} from "react-aria-components";
import {useTranslations} from "next-intl";
import {Button, ListBox, Popover} from "@heroui/react";
import {LuListChecks} from "react-icons/lu";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import {DEFAULT_STATS, STAT_KEYS, type StatKey} from "@/features/insights/params";

// Which statistics the stats card shows (?st). The unit is page-wide (InsightsAnalysisBar).
export default function InsightsStatsControls() {
  const t = useTranslations("insights");
  const {query, update} = useInsightsParams();

  function pickStats(keys: Selection) {
    const next = keys === "all" ? [...STAT_KEYS] : STAT_KEYS.filter((key) => (keys as Set<Key>).has(key));
    const isDefault = next.length === DEFAULT_STATS.length && next.every((key) => DEFAULT_STATS.includes(key));
    update({st: isDefault ? null : next.join(",")});
  }

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <Button size="sm" variant="tertiary" isIconOnly aria-label={t("pickStats")}>
          <LuListChecks/>
        </Button>
        <Popover.Content>
          <Popover.Dialog className="flex w-56 flex-col gap-2 p-2">
            <p className="text-foreground-500 px-1 text-xs font-medium uppercase tracking-wide">{t("pickStats")}</p>
            <ListBox
              aria-label={t("pickStats")}
              selectionMode="multiple"
              selectedKeys={new Set(query.stats)}
              onSelectionChange={pickStats}
            >
              {STAT_KEYS.map((key: StatKey) => (
                <ListBox.Item key={key} id={key} textValue={t(`stat.${key}`)}>
                  {t(`stat.${key}`)}
                  <ListBox.ItemIndicator/>
                </ListBox.Item>
              ))}
            </ListBox>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
