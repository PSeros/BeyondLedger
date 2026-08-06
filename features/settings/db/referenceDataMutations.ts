"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import {Prisma} from "@/prisma/generated/client";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import {normalizeTagColor} from "@/features/tags/colors";
import {normalizeWorkspaceColor} from "@/features/workspaces/colors";
// NOTE: this is a "use server" module — every *export* must be an async function, so TagOption is
// only imported here (for the create/rename return types), never re-exported. Consumers import it
// from "@/features/tags/types" directly.
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";

// Reference-data (lookup-table) mutations: Supplier, SupplierCategory, ItemCategory,
// ContractCategory, Frequency. Used by BOTH the inline "+ Add new…" popovers in the Add form
// (7a) and the /settings management page (7b).
//
// Unlike createBill/createContract (which return void and rely on revalidatePath + a client
// refresh), the CREATE and RENAME actions here RETURN the affected row ({id, name}). The inline
// popovers need that so they can append the new row to their local option list and select it
// without a router.refresh() wiping the half-filled Add form. Settings ignores the return value
// and calls router.refresh() itself.

// Every option list the new/renamed/deleted lookup can appear in.
function revalidateLookupSurfaces(): void {
  revalidatePath("/settings");
  revalidatePath("/expense/fixed");
  revalidatePath("/expense/variable");
  revalidatePath("/income/fixed");
  revalidatePath("/income/variable");
}

// Error messages are localized (the app's active locale comes from the AppSettings singleton, read
// server-side by next-intl's request config) since they surface to the user in Settings + the
// inline "+ Add new…" popovers.
type EntityKey = "category" | "source" | "supplier" | "frequency" | "tag" | "workspace";

async function cleanName(name: string): Promise<string> {
  const trimmed = name.trim();
  if (trimmed === "") {
    const t = await getTranslations("errors");
    throw new Error(t("nameRequired"));
  }
  return trimmed;
}

async function cleanPositiveId(id: number): Promise<number> {
  if (!Number.isInteger(id) || id <= 0) {
    const t = await getTranslations("errors");
    throw new Error(t("invalidId"));
  }
  return id;
}

// SQLite has no case-insensitive Prisma filter (no `mode: "insensitive"`), so we load the
// existing names and compare lowercased in JS. `exceptId` skips the row being renamed.
async function assertUniqueName(existing: {id: number; name: string}[], name: string, exceptId?: number): Promise<void> {
  const lower = name.toLowerCase();
  if (existing.some((row) => row.id !== exceptId && row.name.toLowerCase() === lower)) {
    const t = await getTranslations("errors");
    throw new Error(t("alreadyExists", {name}));
  }
}

// Turns Prisma's foreign-key-constraint failure (deleting a row still referenced by an
// expense) into a friendly localized message; rethrows anything else.
async function toDeleteError(error: unknown, entity: EntityKey): Promise<Error> {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    const [t, tEntities] = await Promise.all([getTranslations("errors"), getTranslations("entities")]);
    return new Error(t("inUse", {label: tEntities(entity)}));
  }
  if (error instanceof Error) {
    return error;
  }
  const t = await getTranslations("errors");
  return new Error(t("couldNotDelete"));
}

// --- SupplierCategory -------------------------------------------------------

export async function createSupplierCategory(name: string): Promise<FilterOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.supplierCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.supplierCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameSupplierCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.supplierCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.supplierCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteSupplierCategory(id: number): Promise<void> {
  try {
    await client.supplierCategory.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"category");
  }
  revalidateLookupSurfaces();
}

// --- ItemCategory -----------------------------------------------------------

export async function createItemCategory(name: string): Promise<FilterOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.itemCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.itemCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameItemCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.itemCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.itemCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteItemCategory(id: number): Promise<void> {
  try {
    await client.itemCategory.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"category");
  }
  revalidateLookupSurfaces();
}

// --- ContractCategory -------------------------------------------------------

export async function createContractCategory(name: string): Promise<FilterOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.contractCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.contractCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameContractCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.contractCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.contractCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteContractCategory(id: number): Promise<void> {
  try {
    await client.contractCategory.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"category");
  }
  revalidateLookupSurfaces();
}

// --- IncomeSource -----------------------------------------------------------
// Name-only lookup (unlike Supplier, an income source has no category).

export async function createIncomeSource(name: string): Promise<FilterOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.incomeSource.findMany({select: {id: true, name: true}}), clean);
  const created = await client.incomeSource.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameIncomeSource(id: number, name: string): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.incomeSource.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.incomeSource.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteIncomeSource(id: number): Promise<void> {
  try {
    await client.incomeSource.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"source");
  }
  revalidateLookupSurfaces();
}

// --- IncomeCategory ---------------------------------------------------------

export async function createIncomeCategory(name: string): Promise<FilterOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.incomeCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.incomeCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameIncomeCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.incomeCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.incomeCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteIncomeCategory(id: number): Promise<void> {
  try {
    await client.incomeCategory.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"category");
  }
  revalidateLookupSurfaces();
}

// --- Supplier ---------------------------------------------------------------

export async function createSupplier(name: string, categoryId: number): Promise<FilterOption> {
  const clean = await cleanName(name);
  const catId = await cleanPositiveId(categoryId);
  await assertUniqueName(await client.supplier.findMany({select: {id: true, name: true}}), clean);
  const created = await client.supplier.create({data: {name: clean, categoryId: catId}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function updateSupplier(id: number, name: string, categoryId: number): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  const catId = await cleanPositiveId(categoryId);
  await assertUniqueName(await client.supplier.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.supplier.update({
    where: {id: rowId},
    data: {name: clean, categoryId: catId},
    select: {id: true, name: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteSupplier(id: number): Promise<void> {
  try {
    await client.supplier.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"supplier");
  }
  revalidateLookupSurfaces();
}

// --- Frequency --------------------------------------------------------------
// Frequency has no autoincrement id (manual @id) plus value (billings per year) and
// isRecurring. Settings-only — never offered inline. New rows get max(id)+1.

async function cleanFrequencyValue(value: number): Promise<number> {
  if (!Number.isInteger(value) || value < 0) {
    const t = await getTranslations("errors");
    throw new Error(t("valueWholeNumber"));
  }
  return value;
}

export async function createFrequency(name: string, value: number, isRecurring: boolean): Promise<FilterOption> {
  const clean = await cleanName(name);
  const perYear = await cleanFrequencyValue(value);
  await assertUniqueName(await client.frequency.findMany({select: {id: true, name: true}}), clean);
  const {_max} = await client.frequency.aggregate({_max: {id: true}});
  const id = (_max.id ?? 0) + 1;
  const created = await client.frequency.create({
    data: {id, name: clean, value: perYear, isRecurring},
    select: {id: true, name: true},
  });
  revalidateLookupSurfaces();
  return created;
}

export async function updateFrequency(
  id: number,
  name: string,
  value: number,
  isRecurring: boolean,
): Promise<FilterOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  const perYear = await cleanFrequencyValue(value);
  await assertUniqueName(await client.frequency.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.frequency.update({
    where: {id: rowId},
    data: {name: clean, value: perYear, isRecurring},
    select: {id: true, name: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteFrequency(id: number): Promise<void> {
  try {
    await client.frequency.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error,"frequency");
  }
  revalidateLookupSurfaces();
}

// --- Tag --------------------------------------------------------------------
// Cross-cutting labels on Bills/Contracts/Income. Like categories: name-only + unique (checked
// case-insensitively). Also carry a color (validated against the palette, defaulted when absent).
// create/rename return the {id, name, color} row so inline "+ create tag" can append + select it.

export async function createTag(name: string, color?: string): Promise<TagOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.tag.findMany({select: {id: true, name: true}}), clean);
  const created = await client.tag.create({
    data: {name: clean, color: normalizeTagColor(color)},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return created;
}

export async function renameTag(id: number, name: string): Promise<TagOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.tag.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.tag.update({
    where: {id: rowId},
    data: {name: clean},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function setTagColor(id: number, color: string): Promise<TagOption> {
  const rowId = await cleanPositiveId(id);
  const updated = await client.tag.update({
    where: {id: rowId},
    data: {color: normalizeTagColor(color)},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteTag(id: number): Promise<void> {
  try {
    await client.tag.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error, "tag");
  }
  revalidateLookupSurfaces();
}

// --- Workspace (bank account) -----------------------------------------------
// Like Tag: name-only + unique (case-insensitive) + a palette color. The record FKs are RESTRICT so
// deleting an account still holding bills/contracts/income/budgets fails (P2003 → friendly error).

export async function createWorkspace(name: string, color?: string): Promise<WorkspaceOption> {
  const clean = await cleanName(name);
  await assertUniqueName(await client.workspace.findMany({select: {id: true, name: true}}), clean);
  const created = await client.workspace.create({
    data: {name: clean, color: normalizeWorkspaceColor(color)},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return created;
}

export async function renameWorkspace(id: number, name: string): Promise<WorkspaceOption> {
  const rowId = await cleanPositiveId(id);
  const clean = await cleanName(name);
  await assertUniqueName(await client.workspace.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.workspace.update({
    where: {id: rowId},
    data: {name: clean},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function setWorkspaceColor(id: number, color: string): Promise<WorkspaceOption> {
  const rowId = await cleanPositiveId(id);
  const updated = await client.workspace.update({
    where: {id: rowId},
    data: {color: normalizeWorkspaceColor(color)},
    select: {id: true, name: true, color: true},
  });
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteWorkspace(id: number): Promise<void> {
  try {
    await client.workspace.delete({where: {id: await cleanPositiveId(id)}});
  } catch (error) {
    throw await toDeleteError(error, "workspace");
  }
  revalidateLookupSurfaces();
}
