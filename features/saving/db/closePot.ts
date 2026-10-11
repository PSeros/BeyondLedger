"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import {addDays, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {countOccurrences} from "@/features/expense/shared/db/recurrence";
import {nudge} from "@/features/integrations/mqtt/runtime";

function revalidateSavings() {
  revalidatePath("/saving", "layout");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  nudge("saving");
}

// Closes a pot: books its remaining balance out (per account), ends its running plans and hides it.
// With `moveToId` the balance is deposited into that pot (net savings unchanged); without, it is
// only withdrawn, so it stops counting as saved and lands in the Überschuss.
export async function closePot(targetId: number, moveToId: number | null): Promise<void> {
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  const [pot, moveTo, oneOff, savings, t] = await Promise.all([
    client.savingTarget.findUnique({where: {id: targetId}, select: {id: true, name: true, closedAt: true}}),
    moveToId ? client.savingTarget.findUnique({where: {id: moveToId}, select: {id: true, name: true, closedAt: true}}) : null,
    client.frequency.findFirst({where: {isRecurring: false}, select: {id: true}}),
    client.saving.findMany({
      where: {targetId},
      select: {workspaceId: true, totalAmount: true, startDate: true, endDate: true, frequency: true},
    }),
    getTranslations("saving"),
  ]);
  if (!pot || pot.closedAt) throw new Error("Pot not found or already closed");
  if (moveToId && (!moveTo || moveTo.closedAt || moveTo.id === targetId)) throw new Error("Invalid target pot");
  if (!oneOff) throw new Error("No one-time frequency");

  // What is in the pot today, per account.
  const balances = new Map<number, number>();
  for (const s of savings) {
    const paid = Number(s.totalAmount) * countOccurrences(s, s.startDate, addDays(today, 1));
    balances.set(s.workspaceId, (balances.get(s.workspaceId) ?? 0) + paid);
  }

  await client.$transaction(async (tx) => {
    for (const [workspaceId, raw] of balances) {
      const balance = Math.round(raw * 100) / 100;
      if (balance === 0) continue;
      const common = {frequencyId: oneOff.id, startDate: today, workspaceId};
      await tx.saving.create({
        data: {...common, targetId, totalAmount: -balance, name: moveTo ? t("closeOutTo", {pot: moveTo.name}) : t("closeOut")},
      });
      if (moveTo) {
        await tx.saving.create({data: {...common, targetId: moveTo.id, totalAmount: balance, name: t("closeIn", {pot: pot.name})}});
      }
    }
    await tx.saving.updateMany({
      where: {targetId, frequency: {isRecurring: true}, OR: [{endDate: null}, {endDate: {gt: today}}]},
      data: {endDate: today},
    });
    await tx.savingTarget.update({where: {id: targetId}, data: {closedAt: now}});
  });

  revalidateSavings();
}

export async function reopenPot(targetId: number): Promise<void> {
  await client.savingTarget.update({where: {id: targetId}, data: {closedAt: null}});
  revalidateSavings();
}
