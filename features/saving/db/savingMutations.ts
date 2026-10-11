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

// Both tab lists (changing the frequency moves a row between tabs) plus the detail on both paths.
// Savings feed the budget catch-all target, so the budget surfaces + MQTT are refreshed too.
function revalidateSaving(id: number) {
  revalidatePath("/saving/fixed");
  revalidatePath("/saving/variable");
  revalidatePath(`/saving/fixed/${id}`);
  revalidatePath(`/saving/variable/${id}`);
  revalidateSavingSurfaces();
}

function revalidateSavingSurfaces() {
  revalidatePath("/budget");
  revalidatePath("/dashboard");
  nudge("saving");
}

// Creates a new Saving; its frequency decides the tab.
export async function createSaving(formData: FormData): Promise<void> {
  const tagIds = parseTagIds(formData);
  await client.saving.create({
    data: {...parseSavingData(formData), tags: {create: tagIds.map((tagId) => ({tagId}))}},
  });
  revalidatePath("/saving/fixed");
  revalidatePath("/saving/variable");
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

  revalidateSaving(id);
}

// Deletes a Saving.
export async function deleteSaving(id: number): Promise<void> {
  await client.saving.delete({where: {id}});
  revalidatePath("/saving/fixed");
  revalidatePath("/saving/variable");
  revalidateSavingSurfaces();
}
