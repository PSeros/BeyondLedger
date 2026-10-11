"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";

// Sets each account's starting balance for the Überschuss. null / empty = 0.
export async function setSurplusOpening(entries: {workspaceId: number; amount: number | null}[]): Promise<void> {
  for (const {workspaceId, amount} of entries) {
    if (!Number.isInteger(workspaceId) || workspaceId <= 0) throw new Error("Invalid account");
    if (amount != null && !Number.isFinite(amount)) throw new Error("Invalid amount");
  }
  await client.$transaction(
    entries.map(({workspaceId, amount}) =>
      client.workspace.update({where: {id: workspaceId}, data: {openingBalance: amount ? amount : null}}),
    ),
  );
  revalidatePath("/saving", "layout");
}
