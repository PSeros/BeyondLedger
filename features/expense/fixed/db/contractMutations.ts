"use server";

import {revalidatePath} from "next/cache";
import {nudge} from "@/features/integrations/mqtt/runtime";
import {client} from "@/lib/prisma";
import {
  optionalDate,
  optionalInt,
  optionalString,
  requireDate,
  requireId,
  requireString,
} from "@/features/expense/shared/db/formData";
import {parseTagIds} from "@/features/tags/tagFormData";
import {parseWorkspaceId} from "@/features/workspaces/workspaceFormData";

// Reads and validates the Contract's own fields from the form. Shared by create + update.
function parseContractData(formData: FormData) {
  const amount = Number(requireString(formData, "amount"));
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }

  return {
    name: requireString(formData, "name"),
    supplierId: requireId(formData, "supplierId"),
    categoryId: requireId(formData, "categoryId"),
    frequencyId: requireId(formData, "frequencyId"),
    workspaceId: parseWorkspaceId(formData),
    documentNumber: optionalString(formData, "documentNumber"),
    totalAmount: amount,
    startDate: requireDate(formData, "startDate"),
    endDate: optionalDate(formData, "endDate"),
    noticePeriod: optionalInt(formData, "noticePeriod"),
  };
}

// Creates a new Contract. Revalidates the list so the table, chart, and upcoming card pick up
// the new row; the client closes the modal and refreshes.
export async function createContract(formData: FormData): Promise<void> {
  const tagIds = parseTagIds(formData);
  await client.contract.create({
    data: {...parseContractData(formData), tags: {create: tagIds.map((tagId) => ({tagId}))}},
  });
  revalidatePath("/expense/fixed");
  nudge("contract");
}

// Reads the edit form's FormData and updates the Contract's own fields. Revalidates the list +
// this contract's detail so the table, chart, upcoming card, and detail view all pick up the
// change; the client form soft-navigates out of edit mode.
export async function updateContract(id: number, formData: FormData): Promise<void> {
  const data = parseContractData(formData);
  const tagIds = parseTagIds(formData);

  await client.$transaction(async (tx) => {
    await tx.contract.update({where: {id}, data});
    await tx.entryTag.deleteMany({where: {contractId: id}});
    if (tagIds.length > 0) {
      await tx.entryTag.createMany({data: tagIds.map((tagId) => ({contractId: id, tagId}))});
    }
  });

  revalidatePath("/expense/fixed");
  revalidatePath(`/expense/fixed/${id}`);
  nudge("contract");
}

// Deletes a Contract (its FileAssets cascade). The detail view navigates back to the list.
export async function deleteContract(id: number): Promise<void> {
  await client.contract.delete({where: {id}});
  revalidatePath("/expense/fixed");
  nudge("contract");
}
