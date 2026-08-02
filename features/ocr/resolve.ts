import {client} from "@/lib/prisma";
import {createSupplier} from "@/features/settings/db/referenceDataMutations";
import {type BillDraft, UNCATEGORIZED} from "@/features/ocr/schema";

// Turns an extracted BillDraft (names) into the FK ids createBill needs (Phase 8c). The locked rule:
// item categories map to EXISTING ItemCategory rows only — OCR never invents a new one; anything the
// model couldn't match falls back to a single "Uncategorized" sentinel. Suppliers ARE created when
// new (an entity the bill requires), landing under an "Uncategorized" SupplierCategory since a
// receipt doesn't state the merchant's category. Creating the draft Bill itself is 8d.

export type ResolvedBillItem = {
  name: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: null;
};

export type ResolvedBillDraft = {
  supplierId: number;
  documentNumber: string | null;
  date: Date;
  totalAmount: number;
  items: ResolvedBillItem[];
};

function round2(value: number): number {
  return Number(value.toFixed(2));
}

// SQLite has no case-insensitive Prisma filter, so match in JS (same approach as
// referenceDataMutations.assertUniqueName).
function findIdByName(rows: {id: number; name: string}[], name: string): number | null {
  const lower = name.trim().toLowerCase();
  return rows.find((row) => row.name.toLowerCase() === lower)?.id ?? null;
}

async function getOrCreateSupplierCategoryId(name: string): Promise<number> {
  const rows = await client.supplierCategory.findMany({select: {id: true, name: true}});
  const found = findIdByName(rows, name);
  if (found != null) {
    return found;
  }
  const created = await client.supplierCategory.create({data: {name}, select: {id: true}});
  return created.id;
}

async function getOrCreateItemCategoryId(name: string): Promise<number> {
  const rows = await client.itemCategory.findMany({select: {id: true, name: true}});
  const found = findIdByName(rows, name);
  if (found != null) {
    return found;
  }
  const created = await client.itemCategory.create({data: {name}, select: {id: true}});
  return created.id;
}

// Parse the model's date (instructed as YYYY-MM-DD) into a UTC-midnight Date, matching
// formData.requireDate. Throws on an unparseable value so 8d can mark the file FAILED.
function parseDraftDate(raw: string): Date {
  const value = raw.trim();
  const isoDay = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const date = isoDay ? new Date(`${isoDay}T00:00:00.000Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Could not parse the document date: "${raw}".`);
  }
  return date;
}

export async function resolveDraft(draft: BillDraft): Promise<ResolvedBillDraft> {
  // --- supplier: match existing (ci), else create the entity under "Uncategorized" ---
  const supplierName = draft.supplierName.trim() || "Unknown supplier";
  const suppliers = await client.supplier.findMany({select: {id: true, name: true}});
  let supplierId = findIdByName(suppliers, supplierName);
  if (supplierId == null) {
    const supplierCategoryId = await getOrCreateSupplierCategoryId(UNCATEGORIZED);
    const created = await createSupplier(supplierName, supplierCategoryId);
    supplierId = created.id;
  }

  // --- items: map each category to an EXISTING ItemCategory only; else the sentinel ---
  const itemCategories = await client.itemCategory.findMany({select: {id: true, name: true}});
  let uncategorizedItemId: number | null = null;

  const items: ResolvedBillItem[] = [];
  for (const lineItem of draft.lineItems) {
    if (lineItem.name.trim() === "") {
      continue; // skip a nameless row rather than create a junk item
    }
    let categoryId = findIdByName(itemCategories, lineItem.category);
    if (categoryId == null) {
      uncategorizedItemId ??= await getOrCreateItemCategoryId(UNCATEGORIZED);
      categoryId = uncategorizedItemId;
    }
    const quantity = lineItem.quantity > 0 ? lineItem.quantity : 1;
    const unitPrice = lineItem.unitPrice >= 0 ? lineItem.unitPrice : 0;
    items.push({
      name: lineItem.name.trim(),
      categoryId,
      quantity,
      unitPrice,
      totalPrice: round2(quantity * unitPrice),
      warranty: null,
    });
  }

  // Mirror createBill: derive the total from items when present, else the extracted grand total.
  const totalAmount =
    items.length > 0 ? round2(items.reduce((sum, item) => sum + item.totalPrice, 0)) : round2(draft.total);

  return {
    supplierId,
    documentNumber: draft.documentNumber?.trim() || null,
    date: parseDraftDate(draft.date),
    totalAmount,
    items,
  };
}
