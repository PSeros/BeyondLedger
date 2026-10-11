"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {optionalDate, requireDate, requireId, requireString} from "@/features/expense/shared/db/formData";
import {parseTagIds} from "@/features/tags/tagFormData";
import {parseWorkspaceId} from "@/features/workspaces/workspaceFormData";
import {nudge} from "@/features/integrations/mqtt/runtime";

// Reads and validates a Saving's fields. The amount input is always positive; the Deposit/Withdraw
// toggle posts `direction`, and a withdrawal is stored as a negative one-off.
function parseSavingData(formData: FormData) {
  const magnitude = Number(requireString(formData, "amount"));
  if (Number.isNaN(magnitude) || magnitude < 0) {
    throw new Error("Invalid amount");
  }
  const amount = formData.get("direction") === "withdraw" ? -magnitude : magnitude;

  return {
    name: requireString(formData, "name"),
    targetId: requireId(formData, "targetId"),
    frequencyId: requireId(formData, "frequencyId"),
    workspaceId: parseWorkspaceId(formData),
    totalAmount: amount,
    startDate: requireDate(formData, "startDate"),
    endDate: optionalDate(formData, "endDate"),
  };
}

// Every Sparen page (overview, pots, Überschuss, entries). Savings also feed the budget catch-all
// target and the dashboard, so those + MQTT are refreshed too.
function revalidateSavingSurfaces() {
  revalidatePath("/saving", "layout");
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  nudge("saving");
}

// Creates a new Saving (a recurring frequency makes it a plan).
export async function createSaving(formData: FormData): Promise<void> {
  const tagIds = parseTagIds(formData);
  await client.saving.create({
    data: {...parseSavingData(formData), tags: {create: tagIds.map((tagId) => ({tagId}))}},
  });
  revalidateSavingSurfaces();
}

// Updates a Saving from the edit form.
export async function updateSaving(id: number, formData: FormData): Promise<void> {
  const data = parseSavingData(formData);
  const tagIds = parseTagIds(formData);

  await client.$transaction(async (tx) => {
    await tx.saving.update({where: {id}, data});
    await tx.entryTag.deleteMany({where: {savingId: id}});
    if (tagIds.length > 0) {
      await tx.entryTag.createMany({data: tagIds.map((tagId) => ({savingId: id, tagId}))});
    }
  });

  revalidateSavingSurfaces();
}

// Deletes a Saving.
export async function deleteSaving(id: number): Promise<void> {
  await client.saving.delete({where: {id}});
  revalidateSavingSurfaces();
}
