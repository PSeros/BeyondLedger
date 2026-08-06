"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {optionalDate, requireDate, requireId, requireString} from "@/features/expense/shared/db/formData";
import {parseTagIds} from "@/features/tags/tagFormData";
import {parseWorkspaceId} from "@/features/workspaces/workspaceFormData";

// Reads and validates an Income's fields from the form. Shared by create + update.
function parseIncomeData(formData: FormData) {
  const amount = Number(requireString(formData, "amount"));
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }

  return {
    name: requireString(formData, "name"),
    sourceId: requireId(formData, "sourceId"),
    categoryId: requireId(formData, "categoryId"),
    frequencyId: requireId(formData, "frequencyId"),
    workspaceId: parseWorkspaceId(formData),
    totalAmount: amount,
    startDate: requireDate(formData, "startDate"),
    endDate: optionalDate(formData, "endDate"),
  };
}

// Revalidate BOTH tab lists (income is one model — changing the frequency can move a row between
// fixed and variable) plus this income's detail on both tab paths.
function revalidateIncome(id: number) {
  revalidatePath("/income/fixed");
  revalidatePath("/income/variable");
  revalidatePath(`/income/fixed/${id}`);
  revalidatePath(`/income/variable/${id}`);
}

// Creates a new Income. The chosen frequency's isRecurring decides which tab it appears on, so
// revalidate both lists; the client closes the modal and refreshes.
export async function createIncome(formData: FormData): Promise<void> {
  const tagIds = parseTagIds(formData);
  await client.income.create({
    data: {...parseIncomeData(formData), tags: {create: tagIds.map((tagId) => ({tagId}))}},
  });
  revalidatePath("/income/fixed");
  revalidatePath("/income/variable");
}

// Reads the edit form's FormData and updates the Income's fields; the client form soft-navigates
// out of edit mode.
export async function updateIncome(id: number, formData: FormData): Promise<void> {
  const data = parseIncomeData(formData);
  const tagIds = parseTagIds(formData);

  await client.$transaction(async (tx) => {
    await tx.income.update({where: {id}, data});
    await tx.entryTag.deleteMany({where: {incomeId: id}});
    if (tagIds.length > 0) {
      await tx.entryTag.createMany({data: tagIds.map((tagId) => ({incomeId: id, tagId}))});
    }
  });

  revalidateIncome(id);
}

// Deletes an Income. The detail view navigates back to the list (which the revalidate refreshes).
export async function deleteIncome(id: number): Promise<void> {
  await client.income.delete({where: {id}});
  revalidatePath("/income/fixed");
  revalidatePath("/income/variable");
}
