"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Button, ListBox, Popover, RangeCalendar} from "@heroui/react";
import {parseDate} from "@internationalized/date";
import {LuChevronDown, LuChevronLeft, LuChevronRight, LuRotateCcw} from "react-icons/lu";
import {BUDGET_PERIOD_TYPES, monthKey, parseMonthAnchor, type BudgetPeriodType} from "@/features/budget/period";
import type {InsightsWindow} from "@/features/insights/params";
import {resolveWindow, stepAnchor} from "@/features/insights/window";

// `‹ [ Monatlich · Oktober 2026 ▾ ] ›` — one control for the budget-style period. The popover lists
// the period types as rows; a specific month adds a month grid, a range an inline calendar. The
// arrows step the month anchor (?at) by one period and disappear for range / all time.
export default function InsightsPeriodPicker({
  window,
  onChange,
}: {
  window: InsightsWindow;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  const t = useTranslations("insights");
  const tBudget = useTranslations("budget");
  const tNav = useTranslations("periodNavigator");
  const format = useFormatter();

  const typeLabels: Record<BudgetPeriodType, string> = {
    MONTHLY: tBudget("periodMonthly"),
    QUARTERLY: tBudget("periodQuarterly"),
    YEARLY: tBudget("periodYearly"),
    MONTH_OF_YEAR: t("periodMonthOfYear"),
    RANGE: tBudget("periodRange"),
    OPEN: tBudget("allTime"),
  };

  const anchor = parseMonthAnchor(window.anchor);
  const year = anchor.getUTCFullYear();
  const monthName = (month: number, style: "long" | "short" = "long") =>
    format.dateTime(new Date(Date.UTC(2000, month - 1, 1)), {month: style, timeZone: "UTC"});

  const now = new Date();
  const resolved = resolveWindow(window);
  const steps = window.periodType !== "RANGE" && window.periodType !== "OPEN";
  const isCurrent = !steps || (resolved.start != null && resolved.end != null && resolved.start <= now && now < resolved.end);

  const value = {
    MONTHLY: format.dateTime(anchor, {month: "long", year: "numeric", timeZone: "UTC"}),
    QUARTERLY: tBudget("quarterLabel", {quarter: Math.floor(anchor.getUTCMonth() / 3) + 1, year}),
    YEARLY: String(year),
    MONTH_OF_YEAR: `${monthName(window.month)} ${year}`,
    RANGE: window.from && window.to
      ? format.dateTimeRange(new Date(window.from), new Date(window.to), {dateStyle: "medium", timeZone: "UTC"})
      : t("windowPickRange"),
    OPEN: t("allTimeValue"),
  }[window.periodType];

  function step(delta: -1 | 1) {
    const next = stepAnchor(window, delta);
    onChange({at: next === monthKey(now) ? null : next});
  }

  const range = window.from && window.to ? {start: parseDate(window.from), end: parseDate(window.to)} : null;

  return (
    <div className="flex items-center gap-1">
      {steps ? (
        <Button variant="tertiary" size="sm" isIconOnly aria-label={tNav("prev")} onPress={() => step(-1)}>
          <LuChevronLeft className="size-4"/>
        </Button>
      ) : null}
      <Popover>
        <Button variant="tertiary" size="sm" className="min-w-44 justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="hidden text-xs text-muted sm:inline">{typeLabels[window.periodType]}</span>
            <span className="truncate font-medium">{value}</span>
          </span>
          <LuChevronDown className="size-4 shrink-0 text-muted"/>
        </Button>
        <Popover.Content placement="bottom">
          <Popover.Dialog className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 p-2">
            <ListBox
              aria-label={t("windowLabel")}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={new Set([window.periodType])}
              onSelectionChange={(keys) => {
                const next = [...(keys as Set<string>)][0];
                if (next && next !== window.periodType) onChange({p: next === "MONTHLY" ? null : next, at: null, m: null});
              }}
            >
              {BUDGET_PERIOD_TYPES.map((type) => (
                <ListBox.Item key={type} id={type} textValue={typeLabels[type]}>
                  {typeLabels[type]}
                  <ListBox.ItemIndicator/>
                </ListBox.Item>
              ))}
            </ListBox>

            {window.periodType === "MONTH_OF_YEAR" ? (
              <div className="grid grid-cols-4 gap-1 border-t border-[var(--border)] pt-2">
                {Array.from({length: 12}, (_, i) => i + 1).map((month) => (
                  <Button
                    key={month}
                    size="sm"
                    variant={window.month === month ? "secondary" : "ghost"}
                    onPress={() => onChange({m: String(month)})}
                  >
                    {monthName(month, "short")}
                  </Button>
                ))}
              </div>
            ) : null}

            {window.periodType === "RANGE" ? (
              <div className="border-t border-[var(--border)] pt-2">
                <RangeCalendar
                  aria-label={tBudget("periodRange")}
                  value={range}
                  onChange={(next) => next && onChange({from: next.start.toString(), to: next.end.toString()})}
                >
                  <RangeCalendar.Header>
                    <RangeCalendar.NavButton slot="previous"/>
                    <RangeCalendar.Heading/>
                    <RangeCalendar.NavButton slot="next"/>
                  </RangeCalendar.Header>
                  <RangeCalendar.Grid>
                    <RangeCalendar.GridHeader>
                      {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                    </RangeCalendar.GridHeader>
                    <RangeCalendar.GridBody>
                      {(date) => <RangeCalendar.Cell date={date}/>}
                    </RangeCalendar.GridBody>
                  </RangeCalendar.Grid>
                </RangeCalendar>
              </div>
            ) : null}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      {steps ? (
        <Button variant="tertiary" size="sm" isIconOnly aria-label={tNav("next")} onPress={() => step(1)}>
          <LuChevronRight className="size-4"/>
        </Button>
      ) : null}
      {!isCurrent ? (
        <Button variant="ghost" size="sm" isIconOnly aria-label={tNav("current")} onPress={() => onChange({at: null})}>
          <LuRotateCcw className="size-4"/>
        </Button>
      ) : null}
    </div>
  );
}
