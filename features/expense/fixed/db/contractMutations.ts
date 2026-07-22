"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function requireId(formData: FormData, key: string): number {
  const parsed = Number(formData.get(key));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid id for field: ${key}`);
  }
  return parsed;
}

function requireDate(formData: FormData, key: string): Date {
  const value = requireString(formData, key);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for field: ${key}`);
  }
  return date;
}

function optionalDate(formData: FormData, key: string): Date | null {
  const value = optionalString(formData, key);
  if (value === null) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalInt(formData: FormData, key: string): number | null {
  const raw = optionalString(formData, key);
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

// First mutation in the app. Reads the edit form's FormData and updates the Contract's own
// fields. Revalidates the list + this contract's detail so the table, chart, upcoming card,
// and detail view all pick up the change; the client form soft-navigates out of edit mode.
export async function updateContract(id: number, formData: FormData): Promise<void> {
  const amount = Number(requireString(formData, "amount"));
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }

  await client.contract.update({
    where: {id},
    data: {
      name: requireString(formData, "name"),
      supplierId: requireId(formData, "supplierId"),
      categoryId: requireId(formData, "categoryId"),
      frequencyId: requireId(formData, "frequencyId"),
      documentNumber: optionalString(formData, "documentNumber"),
      totalAmount: amount,
      startDate: requireDate(formData, "startDate"),
      endDate: optionalDate(formData, "endDate"),
      noticePeriod: optionalInt(formData, "noticePeriod"),
    },
  });

  revalidatePath("/expense/fixed");
  revalidatePath(`/expense/fixed/${id}`);
}
