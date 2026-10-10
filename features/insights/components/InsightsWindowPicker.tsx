"use client";

import {useEffect, useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, Input, ListBox, Popover, RangeCalendar, Select} from "@heroui/react";
import {parseDate} from "@internationalized/date";
import {LuCalendarRange} from "react-icons/lu";
import {MAX_WINDOW_DAYS, WINDOW_PRESETS, type InsightsWindow, type WindowPreset} from "@/features/insights/params";

// Rolling window preset (?w), plus a day count (?d) for "last N days" or an inline range calendar
// (?from/?to) for a fixed range. The calendar sits inside a Popover rather than a DateRangePicker so
// only one overlay is involved.
export default function InsightsWindowPicker({
  window,
  onChange,
}: {
  window: InsightsWindow;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const [daysDraft, setDaysDraft] = useState(String(window.days));
  useEffect(() => {
    setDaysDraft(String(window.days));
  }, [window.days]);

  const labels: Record<WindowPreset, string> = {
    "7": t("windowLast", {days: 7}),
    "30": t("windowLast", {days: 30}),
    "90": t("windowLast", {days: 90}),
    "365": t("windowLast", {days: 365}),
    days: t("windowCustomDays"),
    range: t("windowRange"),
  };

  function selectPreset(preset: WindowPreset) {
    onChange({
      w: preset === "30" ? null : preset,
      d: preset === "days" ? String(window.days) : null,
      from: preset === "range" ? window.from : null,
      to: preset === "range" ? window.to : null,
    });
  }

  function commitDays() {
    const n = Math.round(Number(daysDraft));
    if (!Number.isFinite(n) || n < 1) {
      setDaysDraft(String(window.days));
      return;
    }
    onChange({d: String(Math.min(n, MAX_WINDOW_DAYS))});
  }

  const range = window.from && window.to ? {start: parseDate(window.from), end: parseDate(window.to)} : null;
  const rangeLabel = window.from && window.to
    ? format.dateTimeRange(new Date(window.from), new Date(window.to), {dateStyle: "medium", timeZone: "UTC"})
    : t("windowPickRange");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label={t("windowLabel")}
        value={window.preset}
        onChange={(key) => key != null && selectPreset(String(key) as WindowPreset)}
        className="w-44"
      >
        <Select.Trigger>
          <Select.Value/>
          <Select.Indicator/>
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {WINDOW_PRESETS.map((preset) => (
              <ListBox.Item key={preset} id={preset} textValue={labels[preset]}>
                {labels[preset]}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {window.preset === "days" ? (
        <Input
          aria-label={t("windowDaysLabel")}
          type="number"
          min={1}
          max={MAX_WINDOW_DAYS}
          value={daysDraft}
          onChange={(event) => setDaysDraft(event.target.value)}
          onBlur={commitDays}
          onKeyDown={(event) => event.key === "Enter" && commitDays()}
          className="w-24"
        />
      ) : null}

      {window.preset === "range" ? (
        <Popover>
          <Button variant="tertiary" size="sm">
            <LuCalendarRange/>
            {rangeLabel}
          </Button>
          <Popover.Content>
            <Popover.Dialog className="p-2">
              <RangeCalendar
                aria-label={t("windowRange")}
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
