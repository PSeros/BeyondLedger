"use client";

import {Button, ButtonGroup} from "@heroui/react";
import PageToolbar from "@/components/PageToolbar";
import PeriodNavigator from "@/components/PeriodNavigator";
import {useDashboardPeriod} from "@/hooks/useDashboardPeriod";
import type {Granularity} from "@/features/expense/shared/db/cumulativeChart";

const GRANULARITIES: Granularity[] = ["1W", "1M", "1Y"];

// Dashboard-wide period control: the week/month/year unit toggle + the ‹prev/next› navigator that
// together govern every period-scoped tile (chart, KPIs, donuts). Promoted out of the chart card —
// once it drives multiple tiles it no longer belongs inside one of them. Uses the shared PageToolbar
// so it lines up with the expense/income/budget toolbars: navigator on the left (like Budget), unit
// toggle on the right (where those pages put their actions).
export default function DashboardPeriodToolbar() {
  const period = useDashboardPeriod();

  return (
    <PageToolbar
      left={
        <PeriodNavigator
          label={period.label}
          isCurrent={period.isCurrent}
          onStep={period.step}
          onReset={period.reset}
        />
      }
      center={null}
      right={
        <ButtonGroup size="sm">
          {GRANULARITIES.map((g) => (
            <Button
              key={g}
              variant={period.granularity === g ? "secondary" : "tertiary"}
              onPress={() => period.selectGranularity(g)}
            >
              {g}
            </Button>
          ))}
        </ButtonGroup>
      }
    />
  );
}
