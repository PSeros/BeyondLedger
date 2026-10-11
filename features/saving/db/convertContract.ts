"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {nudge} from "@/features/integrations/mqtt/runtime";

// Turns a Contract that is really a savings plan into a Saving, keeping its history (dates, amount,
// frequency, account), tags and attachments. Supplier/category/documentNumber/noticePeriod are dropped.
export async function convertContractToSaving(
  contractId: number,
  targetId: number,
): Promise<{id: number; isRecurring: boolean}> {
  if (!Number.isInteger(targetId) || targetId <= 0) {
    throw new Error("Invalid target");
  }

  const saving = await client.$transaction(async (tx) => {
    const contract = await tx.contract.findUniqueOrThrow({where: {id: contractId}});
    const created = await tx.saving.create({
      data: {
        name: contract.name,
        targetId,
        totalAmount: contract.totalAmount,
        frequencyId: contract.frequencyId,
        startDate: contract.startDate,
        endDate: contract.endDate,
        workspaceId: contract.workspaceId,
      },
      include: {frequency: {select: {isRecurring: true}}},
    });
    await tx.entryTag.updateMany({where: {contractId}, data: {contractId: null, savingId: created.id}});
    await tx.fileAsset.updateMany({where: {contractId}, data: {contractId: null, savingId: created.id}});
    await tx.contract.delete({where: {id: contractId}});
    return created;
  });

  revalidatePath("/expense/fixed");
  revalidatePath("/saving/fixed");
  revalidatePath("/saving/variable");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  nudge("contract");
  nudge("saving");

  return {id: saving.id, isRecurring: saving.frequency.isRecurring};
}
