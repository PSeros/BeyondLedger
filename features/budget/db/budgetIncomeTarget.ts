import {client} from "@/lib/prisma";
import {computeContractContribution, periodInstancesWithin, type PeriodInput, type Window} from "@/features/budget/period";

// The derived target of a budget with `targetFromIncome`: the income arriving in its window MINUS
// what the other budgets of the same account already allocate out of it.
//
// Budgeting is distributing income across expenditures, so the point of a catch-all budget is to
// show what is left once the named budgets have taken their share — the raw income would just be a
// number you can never spend. 1.600 € in, a 600 € groceries budget and a 200 € mobility budget, and
// the catch-all is 800 €.
//
// Allocation is per instance, not per budget (see periodInstancesWithin): a monthly 600 € budget
// takes 600 € out of a month and 7.200 € out of a year, while a yearly 12.000 € one takes its 1/12
// slice out of a month. A budget that claims nothing — no selectors at all — allocates nothing
// either, so a half-configured budget can't quietly eat the remainder.
//
// An Income row has the same shape as a Contract (startDate / endDate / totalAmount / frequency),
// so this deliberately reuses computeContractContribution and the window rule it already encodes:
// if the income's cycle FITS inside the window, count the payments that really land in it; if the
// cycle is LONGER than the window, amortize a slice of it. That is what makes an arbitrary custom
// range answerable: a monthly salary over 15.08.–22.08. contributes ~8/31 of itself, while over a
// whole month it contributes the actual payment. One-time income counts when its date is inside.
// Bounded windows are forecast whole (a fresh month shows its full income, not the pace so far);
// an OPEN budget has no end, so it counts arrivals up to today.

export type IncomeStream = {
  workspaceId: number;
  startDate: Date;
  endDate: Date | null;
  totalAmount: number;
  frequencyValue: number;
  isRecurring: boolean;
};

// Every income stream of an account (or of all accounts when `workspaceId` is null), fetched once
// so a page full of budgets costs one query. Income rows are few — unlike bills, they are one row
// per source, not per transaction.
export async function getIncomeStreams(workspaceId?: number | null): Promise<IncomeStream[]> {
  const rows = await client.income.findMany({
    where: workspaceId != null ? {workspaceId} : undefined,
    select: {
      workspaceId: true,
      startDate: true,
      endDate: true,
      totalAmount: true,
      frequency: {select: {value: true, isRecurring: true}},
    },
  });

  return rows.map((row) => ({
    workspaceId: row.workspaceId,
    startDate: row.startDate,
    endDate: row.endDate,
    totalAmount: Number(row.totalAmount),
    frequencyValue: row.frequency.value,
    isRecurring: row.frequency.isRecurring,
  }));
}

// One competing budget, as far as the remainder is concerned: its period and its effective target.
export type Allocation = PeriodInput & {target: number; isInverse: boolean; claimsAnything: boolean};

// What the other budgets allocate out of `window`. Inverse budgets are skipped — two catch-all
// budgets would otherwise each subtract the other and both land on nothing.
export function allocatedInWindow(others: Allocation[], window: Window): number {
  return others.reduce((sum, other) => {
    if (other.isInverse || !other.claimsAnything) return sum;
    const instances = periodInstancesWithin(other, window);
    return sum + other.target * instances.reduce((total, fraction) => total + fraction, 0);
  }, 0);
}

export function incomeInWindow(
  streams: IncomeStream[],
  workspaceId: number,
  window: Window,
  windowMonths: number,
  now: Date,
): number {
  return streams
    .filter((stream) => stream.workspaceId === workspaceId)
    .reduce((sum, stream) => sum + computeContractContribution(stream, window, windowMonths, now), 0);
}
