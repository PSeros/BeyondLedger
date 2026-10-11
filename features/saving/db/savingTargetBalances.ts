import {client} from "@/lib/prisma";
import {buildSavingWhere, type SavingFilters} from "@/features/saving/db/savingWhere";
import {countOccurrences} from "@/features/expense/shared/db/recurrence";
import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import type {SavingTargetBalance} from "@/features/saving/types";

export type SavingBalanceFilters = Omit<SavingFilters, "status" | "dateFrom" | "dateTo" | "isRecurring" | "frequencyId">;

// Paid in per target up to today: every realized occurrence of plans + one-offs, withdrawals negative.
// Both tabs show the same card, so it spans recurring and one-time rows alike.
export async function getSavingTargetBalances(filters: SavingBalanceFilters = {}): Promise<SavingTargetBalance[]> {
  const savings = await client.saving.findMany({
    where: buildSavingWhere(filters),
    select: {
      startDate: true,
      endDate: true,
      totalAmount: true,
      frequency: {select: {value: true, isRecurring: true}},
      target: {select: {id: true, name: true}},
    },
  });

  const now = new Date();
  const tomorrow = addDays(utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()), 1);
  const byTarget = new Map<number, SavingTargetBalance>();

  for (const saving of savings) {
    const count = countOccurrences(saving, saving.startDate, tomorrow);
    if (count === 0) continue;
    const row = byTarget.get(saving.target.id) ?? {...saving.target, paidIn: 0};
    row.paidIn += Number(saving.totalAmount) * count;
    byTarget.set(saving.target.id, row);
  }

  return [...byTarget.values()].sort((a, b) => b.paidIn - a.paidIn);
}
