"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Button, ListBox, Popover, RangeCalendar, Select} from "@heroui/react";
import {parseDate} from "@internationalized/date";
import {LuCalendarRange} from "react-icons/lu";
import PeriodNavigator from "@/components/PeriodNavigator";
import {BUDGET_PERIOD_TYPES, monthKey, parseMonthAnchor, type BudgetPeriodType} from "@/features/budget/period";
import type {InsightsWindow} from "@/features/insights/params";
import {resolveWindow, stepAnchor} from "@/features/insights/window";

// Budget-style period picker: a period type (?p) plus a ‹ › navigator stepping the month anchor (?at)
// by one period. MONTH_OF_YEAR adds a month select (?m); RANGE an inline range calendar (?from/?to);
// OPEN is all time.
export default function InsightsWindowPicker({
  window,
  onChange,
}: {
  window: InsightsWindow;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  const t = useTranslations("insights");
  const tBudget = useTranslations("budget");
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
  const monthName = (month: number) => format.dateTime(new Date(Date.UTC(2000, month - 1, 1)), {month: "long", timeZone: "UTC"});

  const resolved = resolveWindow(window);
  const now = new Date();
  const isCurrent = resolved.start != null && resolved.end != null && resolved.start <= now && now < resolved.end;

  const navigatorLabel = {
    MONTHLY: format.dateTime(anchor, {month: "long", year: "numeric", timeZone: "UTC"}),
    QUARTERLY: tBudget("quarterLabel", {quarter: Math.floor(anchor.getUTCMonth() / 3) + 1, year}),
    YEARLY: String(year),
    MONTH_OF_YEAR: String(year),
    RANGE: "",
    OPEN: "",
  }[window.periodType];

  function step(delta: -1 | 1) {
    const next = stepAnchor(window, delta);
    onChange({at: next === monthKey(now) ? null : next});
  }

  const range = window.from && window.to ? {start: parseDate(window.from), end: parseDate(window.to)} : null;
  const rangeLabel = window.from && window.to
    ? format.dateTimeRange(new Date(window.from), new Date(window.to), {dateStyle: "medium", timeZone: "UTC"})
    : t("windowPickRange");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={t("windowLabel")}
        value={window.periodType}
        onChange={(key) => key != null && onChange({p: key === "MONTHLY" ? null : String(key), at: null, m: null})}
        className="w-52"
      >
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {BUDGET_PERIOD_TYPES.map((type) => (
              <ListBox.Item key={type} id={type} textValue={typeLabels[type]}>
                {typeLabels[type]}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {window.periodType === "MONTH_OF_YEAR" ? (
        <Select
          aria-label={tBudget("anchorMonthLabel")}
          value={String(window.month)}
          onChange={(key) => key != null && onChange({m: String(key)})}
          className="w-36"
        >
          <Select.Trigger>
            <Select.Value/>
            <Select.Indicator/>
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {Array.from({length: 12}, (_, i) => i + 1).map((month) => (
                <ListBox.Item key={month} id={String(month)} textValue={monthName(month)}>
                  {monthName(month)}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      ) : null}

      {navigatorLabel ? (
        <PeriodNavigator label={navigatorLabel} isCurrent={isCurrent} onStep={step} onReset={() => onChange({at: null})}/>
      ) : null}

      {window.periodType === "RANGE" ? (
        <Popover>
          <Button variant="tertiary" size="sm">
            <LuCalendarRange/>
            {rangeLabel}
          </Button>
          <Popover.Content>
            <Popover.Dialog className="p-2">
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
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : null}
    </div>
  );
}
