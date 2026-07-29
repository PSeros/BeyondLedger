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

// One desired line item parsed from the form. A blank/absent id means a newly-added row (insert);
// a positive id means an existing row (update). Existing item ids not present here are deleted.
type ParsedItem = {
  id: number | null;
  name: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: number | null;
};

// The item rows are posted as repeated same-named fields (itemName, itemCategoryId, …), one entry
// per row in DOM order, so the parallel getAll() arrays line up by index. Empty-name rows are
// skipped so a stray blank row can't create a junk item.
function parseItems(formData: FormData): ParsedItem[] {
  const ids = formData.getAll("itemId");
  const names = formData.getAll("itemName");
  const categoryIds = formData.getAll("itemCategoryId");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");
  const warranties = formData.getAll("itemWarranty");

  const items: ParsedItem[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = String(names[i] ?? "").trim();
    if (name === "") {
      continue;
    }

    const categoryId = Number(categoryIds[i]);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new Error(`Invalid category for item: ${name}`);
    }

    const quantity = Number(quantities[i]);
    if (Number.isNaN(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for item: ${name}`);
    }

    const unitPrice = Number(unitPrices[i]);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for item: ${name}`);
    }

    const rawId = Number(ids[i]);
    const id = Number.isInteger(rawId) && rawId > 0 ? rawId : null;

    const rawWarranty = String(warranties[i] ?? "").trim();
    const warranty = rawWarranty === "" ? null : Number(rawWarranty);
    if (warranty != null && (!Number.isInteger(warranty) || warranty < 0)) {
      throw new Error(`Invalid warranty for item: ${name}`);
    }

    items.push({
      id,
      name,
      categoryId,
      quantity,
      unitPrice,
      totalPrice: Number((quantity * unitPrice).toFixed(2)),
      warranty,
    });
  }
  return items;
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

  let totalAmount: number;
  if (items.length > 0) {
    totalAmount = Number(items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2));
  } else {
    totalAmount = Number(requireString(formData, "amount"));
    if (Number.isNaN(totalAmount) || totalAmount < 0) {
      throw new Error("Invalid amount");
    }
  }

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
