"use client";

import {startTransition} from "react";
import {Button, RangeCalendar} from "@heroui/react";
import {parseDate} from "@internationalized/date";
import {usePathname, useRouter, useSearchParams} from "next/navigation";

// Inline RangeCalendar (rather than a DateRangePicker with its own popover) so it doesn't
// nest an overlay inside the filter Popover. Writes dateFrom/dateTo (yyyy-mm-dd) to the URL,
// applied to the one-time income's occurrence date (startDate).
export default function IncomeDateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const value = dateFrom && dateTo ? {start: parseDate(dateFrom), end: parseDate(dateTo)} : null;

  function setRange(from: string | null, to: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (from && to) {
      params.set("dateFrom", from);
      params.set("dateTo", to);
    } else {
      params.delete("dateFrom");
      params.delete("dateTo");
    }

    const queryString = params.toString();

    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-foreground-500 text-sm">Date range</span>
        {value ? (
          <Button variant="tertiary" size="sm" onPress={() => setRange(null, null)}>
            Clear
          </Button>
        ) : null}
      </div>
      <RangeCalendar
        aria-label="Date range"
        value={value}
        onChange={(range) => setRange(range?.start?.toString() ?? null, range?.end?.toString() ?? null)}
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
  );
}
