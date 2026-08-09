"use client";

import {useTransition} from "react";
import type {Key, Selection} from "react-aria-components";
import {useTranslations} from "next-intl";
import {Button, ListBox, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {BUDGET_PERIOD_TYPES, type BudgetPeriodType} from "@/features/budget/period";

// Filter budgets by period type, via the ?period=<csv> URL param (read server-side). A Popover
// with a multi-select ListBox. `buttonProps` carries the `__button_group_child` marker ButtonGroup
// injects into direct children — forward it to the real Button so it keeps its group styling.
export default function BudgetFilterButton({...buttonProps}) {
  const t = useTranslations("budget");
  const tFilters = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const current = (searchParams.get("period") ?? "").split(",").filter(Boolean);
  const selected = new Set(current);

  const periodLabels: Record<BudgetPeriodType, string> = {
    MONTHLY: t("periodMonthly"),
    QUARTERLY: t("periodQuarterly"),
    YEARLY: t("periodYearly"),
    MONTH_OF_YEAR: t("periodMonthOfYear"),
    RANGE: t("periodRange"),
    OPEN: t("periodOpen"),
  };

  function apply(keys: Selection) {
    const next = keys === "all" ? BUDGET_PERIOD_TYPES.map(String) : Array.from(keys as Set<Key>, String);
    const params = new URLSearchParams(searchParams.toString());
    if (next.length) {
      params.set("period", next.join(","));
    } else {
      params.delete("period");
    }
    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return (
    <Popover>
      <Button {...buttonProps} aria-label={tFilters("filter")}>
        <LuFilter/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2">
          <p className="text-foreground-500 px-1 text-xs font-medium uppercase tracking-wide">{t("periodLabel")}</p>
          <ListBox aria-label={t("periodLabel")} selectionMode="multiple" selectedKeys={selected}
                   onSelectionChange={apply}>
            {BUDGET_PERIOD_TYPES.map((type) => (
              <ListBox.Item key={type} id={type} textValue={periodLabels[type]}>
                {periodLabels[type]}
                <ListBox.ItemIndicator/>
              </ListBox.Item>
            ))}
          </ListBox>
          {current.length ? (
            <Button variant="tertiary" size="sm" onPress={() => apply(new Set())}>
              {tFilters("clear")}
            </Button>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
