"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {
  optionalString,
  parseItems,
  requireDate,
  requireId,
  requireString,
} from "@/features/expense/shared/db/formData";

// Sums the parsed item line totals into a Bill totalAmount (rounded to cents).
function sumItemTotals(items: {totalPrice: number}[]): number {
  return Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
}

// Reads the manual Amount field, used only when a bill has no line items.
function readManualAmount(formData: FormData): number {
  const amount = Number(requireString(formData, "amount"));
  if (Number.isNaN(amount) || amount < 0) {
    throw new Error("Invalid amount");
  }
  return amount;
}

// Creates a new Bill plus its line items in one insert. Mirrors updateBill's parsing: the
// totalAmount is derived from the items (sum of line totals) whenever there is at least one;
// a bill with no items uses the manually-entered Amount instead. Revalidates the list so the
// table, chart, and top-k pick up the new row.
export async function createBill(formData: FormData): Promise<void> {
  const supplierId = requireId(formData, "supplierId");
  const documentNumber = optionalString(formData, "documentNumber");
  const date = requireDate(formData, "date");
  const notes = optionalString(formData, "notes");
  const items = parseItems(formData);

  const totalAmount = items.length > 0 ? sumItemTotals(items) : readManualAmount(formData);

  await client.bill.create({
    data: {
      supplierId,
      documentNumber,
      totalAmount,
      date,
      markdown: notes,
      items: {
        create: items.map((item) => ({
          name: item.name,
          categoryId: item.categoryId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          warranty: item.warranty,
        })),
      },
    },
  });

  revalidatePath("/expense/variable");
}

// Updates a Bill's own fields plus its nested line items in one transaction. Existing items are
// diffed against the submitted rows: matching ids are updated, id-less rows are inserted, and
// existing ids no longer present are deleted. The Bill's totalAmount is derived from the items
// (sum of line totals) whenever there is at least one; a bill left with no items keeps its
// manually-entered amount. Revalidates the list + this bill's detail so table, chart, top-k, and
// detail view pick up the change.
export async function updateBill(id: number, formData: FormData): Promise<void> {
  const supplierId = requireId(formData, "supplierId");
  const documentNumber = optionalString(formData, "documentNumber");
  const date = requireDate(formData, "date");
  const notes = optionalString(formData, "notes");
  const items = parseItems(formData);

  const totalAmount = items.length > 0 ? sumItemTotals(items) : readManualAmount(formData);

  await client.$transaction(async (tx) => {
    await tx.bill.update({
      where: {id},
      data: {supplierId, documentNumber, totalAmount, date, markdown: notes},
    });

    const existing = await tx.item.findMany({where: {billId: id}, select: {id: true}});
    const existingIds = new Set(existing.map((item) => item.id));
    const keptIds = new Set<number>();

    for (const item of items) {
      const data = {
        name: item.name,
        categoryId: item.categoryId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        warranty: item.warranty,
      };
      if (item.id != null && existingIds.has(item.id)) {
        keptIds.add(item.id);
        await tx.item.update({where: {id: item.id}, data});
      } else {
        await tx.item.create({data: {...data, billId: id}});
      }
    }

    const toDelete = [...existingIds].filter((existingId) => !keptIds.has(existingId));
    if (toDelete.length > 0) {
      await tx.item.deleteMany({where: {id: {in: toDelete}}});
    }
  });

  revalidatePath("/expense/variable");
  revalidatePath(`/expense/variable/${id}`);
}

// Deletes a Bill (its Items + FileAssets cascade). The detail view navigates back to the list.
export async function deleteBill(id: number): Promise<void> {
  await client.bill.delete({where: {id}});
  revalidatePath("/expense/variable");
}
