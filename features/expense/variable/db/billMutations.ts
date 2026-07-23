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

// Updates a Bill's own top-level fields (supplier, document number, amount, date, notes).
// The nested line items are edited separately — this only touches the Bill row. Revalidates
// the list + this bill's detail so table, chart, top-k, and detail view pick up the change.
export async function updateBill(id: number, formData: FormData): Promise<void> {
  const amount = Number(requireString(formData, "amount"));
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }

  await client.bill.update({
    where: {id},
    data: {
      supplierId: requireId(formData, "supplierId"),
      documentNumber: optionalString(formData, "documentNumber"),
      totalAmount: amount,
      date: requireDate(formData, "date"),
      markdown: optionalString(formData, "notes"),
    },
  });

  revalidatePath("/expense/variable");
  revalidatePath(`/expense/variable/${id}`);
}
