"use server";

import {revalidatePath} from "next/cache";
import {FileStatusChoice} from "@/prisma/generated/client";
import {client} from "@/lib/prisma";
import {
  optionalString,
  parseItems,
  requireDate,
  requireId,
  requireString,
} from "@/features/expense/shared/db/formData";
import {parseTagIds} from "@/features/tags/tagFormData";
import {DEFAULT_WORKSPACE_ID, parseWorkspaceId} from "@/features/workspaces/workspaceFormData";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import type {ResolvedBillDraft} from "@/features/ocr/resolve";

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
  const tagIds = parseTagIds(formData);
  const workspaceId = parseWorkspaceId(formData);

  const totalAmount = items.length > 0 ? sumItemTotals(items) : readManualAmount(formData);

  await client.bill.create({
    data: {
      supplierId,
      workspaceId,
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
      tags: {create: tagIds.map((tagId) => ({tagId}))},
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
  const tagIds = parseTagIds(formData);
  const workspaceId = parseWorkspaceId(formData);

  const totalAmount = items.length > 0 ? sumItemTotals(items) : readManualAmount(formData);

  await client.$transaction(async (tx) => {
    await tx.bill.update({
      where: {id},
      data: {supplierId, workspaceId, documentNumber, totalAmount, date, markdown: notes},
    });

    // Tags: delete-recreate the join rows (same approach as updateBudget's members).
    await tx.entryTag.deleteMany({where: {billId: id}});
    if (tagIds.length > 0) {
      await tx.entryTag.createMany({data: tagIds.map((tagId) => ({billId: id, tagId}))});
    }

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

// Creates a Bill from an OCR-resolved draft (Phase 8d) and links the source document to it, in one
// transaction. Mirrors createBill's nested-item insert, but the values come from resolveDraft (FK ids
// already resolved) instead of FormData. The account + tags can't be inferred by the AI, so they're
// chosen by the user in the upload dialog and passed in here (account falls back to the active one).
// The uploaded FileAsset is flipped to billId + COMPLETED so it shows up as the new bill's attachment.
// Revalidates the list so table/chart/top-k pick up the row.
export async function createBillFromResolvedDraft(
  draft: ResolvedBillDraft,
  fileId: number,
  options?: {workspaceId?: number; tagIds?: number[]},
): Promise<{billId: number}> {
  const workspaceId = options?.workspaceId ?? (await getActiveWorkspaceId()) ?? DEFAULT_WORKSPACE_ID;
  const tagIds = options?.tagIds ?? [];

  const bill = await client.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
        supplierId: draft.supplierId,
        workspaceId,
        documentNumber: draft.documentNumber,
        totalAmount: draft.totalAmount,
        date: draft.date,
        items: {
          create: draft.items.map((item) => ({
            name: item.name,
            categoryId: item.categoryId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            warranty: item.warranty,
          })),
        },
        tags: {create: tagIds.map((tagId) => ({tagId}))},
      },
      select: {id: true},
    });

    await tx.fileAsset.update({
      where: {id: fileId},
      data: {billId: created.id, status: FileStatusChoice.COMPLETED},
    });

    return created;
  });

  revalidatePath("/expense/variable");
  return {billId: bill.id};
}

// Deletes a Bill (its Items + FileAssets cascade). The detail view navigates back to the list.
export async function deleteBill(id: number): Promise<void> {
  await client.bill.delete({where: {id}});
  revalidatePath("/expense/variable");
}
