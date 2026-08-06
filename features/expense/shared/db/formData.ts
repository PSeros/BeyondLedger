// Shared FormData parsing/validation helpers used by both the expense create and update
// server actions (Bill + Contract). Kept in one place so create and update validate fields
// identically. Imported by billMutations.ts and contractMutations.ts.

export function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }
  return value.trim();
}

export function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function requireId(formData: FormData, key: string): number {
  const parsed = Number(formData.get(key));
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid id for field: ${key}`);
  }
  return parsed;
}

export function requireDate(formData: FormData, key: string): Date {
  const value = requireString(formData, key);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for field: ${key}`);
  }
  return date;
}

export function optionalDate(formData: FormData, key: string): Date | null {
  const value = optionalString(formData, key);
  if (value === null) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function optionalInt(formData: FormData, key: string): number | null {
  const raw = optionalString(formData, key);
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

// One desired line item parsed from the form. A blank/absent id means a newly-added row (insert);
// a positive id means an existing row (update). Existing item ids not present here are deleted.
export type ParsedItem = {
  id: number | null;
  name: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  warranty: number | null;
  tagIds: number[];
};

// The item rows are posted as repeated same-named fields (itemName, itemCategoryId, …), one entry
// per row in DOM order, so the parallel getAll() arrays line up by index. Empty-name rows are
// skipped so a stray blank row can't create a junk item.
export function parseItems(formData: FormData): ParsedItem[] {
  const ids = formData.getAll("itemId");
  const names = formData.getAll("itemName");
  const categoryIds = formData.getAll("itemCategoryId");
  const quantities = formData.getAll("itemQuantity");
  const unitPrices = formData.getAll("itemUnitPrice");
  const warranties = formData.getAll("itemWarranty");
  // Per-row tag ids: one entry per row (comma-joined, possibly empty) so it stays index-aligned
  // with the arrays above even when a row has no tags.
  const tagIdLists = formData.getAll("itemTagIds");

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

    const tagIds = String(tagIdLists[i] ?? "")
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    items.push({
      id,
      name,
      categoryId,
      quantity,
      unitPrice,
      totalPrice: Number((quantity * unitPrice).toFixed(2)),
      warranty,
      tagIds,
    });
  }
  return items;
}
