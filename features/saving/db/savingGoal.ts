"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";

// Sets or clears a pot's goal. null / 0 = open-ended.
export async function setSavingGoal(targetId: number, amount: number | null): Promise<void> {
  if (!Number.isInteger(targetId) || targetId <= 0) throw new Error("Invalid pot");
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) throw new Error("Invalid amount");
  await client.savingTarget.update({where: {id: targetId}, data: {goalAmount: amount ? amount : null}});
  revalidatePath("/saving", "layout");
}
