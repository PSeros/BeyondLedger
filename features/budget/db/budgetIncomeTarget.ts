import {client} from "@/lib/prisma";
import {computeContractContribution, type Window} from "@/features/budget/period";

// Income arriving in a budget's window — the target of a budget with `targetFromIncome` (a monthly
// catch-all budget whose cap is simply "whatever came in this month").
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
