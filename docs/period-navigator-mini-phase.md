# Mini-phase: period navigator (charts + budgets)

Status: **planned, not started.** Captured from dashboard feedback (Phase 12).

## Problem

Every time-based view is locked to the *current* period:

- The charts (`components/ChartCard.tsx`, the new `features/dashboard/components/CashFlowChart.tsx`, and the per-domain chart-data builders in `features/expense/shared/db/cumulativeChart.ts` — `buildWeekView` / `buildMonthView` / `buildYearView`) always anchor on **today**. There's no way to look at a *previous* week/month/year.
- The Budget page (`app/(app)/budget/page.tsx` → `getBudgetsResolved(new Date(), …)`) only ever resolves each budget for the period containing **now**. A monthly budget only shows the current month; you can't step back to last month.

## Desired UX

A single generalized **PeriodNavigator** control with three parts:

1. **‹ previous** arrow
2. a **middle picker** that is conditionally a **week picker**, **month picker**, or **year picker** depending on the active granularity/period type
3. **next ›** arrow

Placement:

- **Budget route:** top-left of the toolbar — the slot where expense/income have their fixed/variable `VFSwitch` (`PageToolbar` `left`). Budget's `left` is currently `null`.
- **Charts:** in the *middle* of the chart card header — to the **left** of the existing `1W / 1M / 1Y` `ButtonGroup` and to the **right** of the title/legend. The granularity buttons pick the *unit*; the navigator moves the *offset* within that unit.

## Implementation sketch

- Introduce a `referenceDate` (or `periodOffset`) that flows into the chart builders instead of the hard-coded `new Date()`. `buildMonthView`/`buildYearView` already take a `today` arg — generalize it to an arbitrary anchor and derive the lookback windows relative to that anchor. Add an equivalent anchor to `buildWeekView` (currently private per feature; consider lifting a shared one into `cumulativeChart.ts` — the dashboard already reimplements it in `dashboardChart.ts`).
- For charts, the offset is **client state** (the chart cards are client components); the server passes the full series and the client shifts the anchor, OR the anchor becomes a prop the server resolves. Decide based on how much recomputation the shift needs — a month step needs data the current payload may not include, so this likely needs the offset in the **URL** (per `docs/variable-expense-performance-guide.md`: cross-section state belongs in the URL) and a server refetch.
- For budgets, thread the chosen anchor into `getBudgetsResolved(anchor, workspaceId)` and `resolveActivePeriod(budget, anchor)` (`features/budget/period.ts`) — the period math already accepts a `now`, so it mostly needs the anchor wired from a URL param (e.g. `?at=2026-07`).
- Build one reusable `PeriodNavigator` component (arrows + conditional week/month/year picker) driven by a `{granularity, offset}` (charts) or `{periodType, anchor}` (budgets) contract, so both consumers share it.

## Open questions

- Do charts and budgets share one URL param or keep separate ones?
- Week picker UX (ISO week vs. "week of <date>")?
- Should stepping past data bounds be disabled, or allowed (showing an empty period)?
