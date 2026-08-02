"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {Prisma} from "@/prisma/generated/client";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

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

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new Error("Name is required.");
  }
  return trimmed;
}

function cleanPositiveId(id: number): number {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid id.");
  }
  return id;
}

// SQLite has no case-insensitive Prisma filter (no `mode: "insensitive"`), so we load the
// existing names and compare lowercased in JS. `exceptId` skips the row being renamed.
function assertUniqueName(existing: {id: number; name: string}[], name: string, exceptId?: number): void {
  const lower = name.toLowerCase();
  if (existing.some((row) => row.id !== exceptId && row.name.toLowerCase() === lower)) {
    throw new Error(`"${name}" already exists.`);
  }
}

// Turns Prisma's foreign-key-constraint failure (deleting a row still referenced by an
// expense) into a friendly message; rethrows anything else.
function toDeleteError(error: unknown, label: string): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    return new Error(`Can't delete this ${label} — it's still used by existing expenses.`);
  }
  return error instanceof Error ? error : new Error("Could not delete.");
}

// --- SupplierCategory -------------------------------------------------------

export async function createSupplierCategory(name: string): Promise<FilterOption> {
  const clean = cleanName(name);
  assertUniqueName(await client.supplierCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.supplierCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameSupplierCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  assertUniqueName(await client.supplierCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.supplierCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteSupplierCategory(id: number): Promise<void> {
  try {
    await client.supplierCategory.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "category");
  }
  revalidateLookupSurfaces();
}

// --- ItemCategory -----------------------------------------------------------

export async function createItemCategory(name: string): Promise<FilterOption> {
  const clean = cleanName(name);
  assertUniqueName(await client.itemCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.itemCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameItemCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  assertUniqueName(await client.itemCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.itemCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteItemCategory(id: number): Promise<void> {
  try {
    await client.itemCategory.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "category");
  }
  revalidateLookupSurfaces();
}

// --- ContractCategory -------------------------------------------------------

export async function createContractCategory(name: string): Promise<FilterOption> {
  const clean = cleanName(name);
  assertUniqueName(await client.contractCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.contractCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameContractCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  assertUniqueName(await client.contractCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.contractCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteContractCategory(id: number): Promise<void> {
  try {
    await client.contractCategory.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "category");
  }
  revalidateLookupSurfaces();
}

// --- IncomeSource -----------------------------------------------------------
// Name-only lookup (unlike Supplier, an income source has no category).

export async function createIncomeSource(name: string): Promise<FilterOption> {
  const clean = cleanName(name);
  assertUniqueName(await client.incomeSource.findMany({select: {id: true, name: true}}), clean);
  const created = await client.incomeSource.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameIncomeSource(id: number, name: string): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  assertUniqueName(await client.incomeSource.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.incomeSource.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteIncomeSource(id: number): Promise<void> {
  try {
    await client.incomeSource.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "source");
  }
  revalidateLookupSurfaces();
}

// --- IncomeCategory ---------------------------------------------------------

export async function createIncomeCategory(name: string): Promise<FilterOption> {
  const clean = cleanName(name);
  assertUniqueName(await client.incomeCategory.findMany({select: {id: true, name: true}}), clean);
  const created = await client.incomeCategory.create({data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function renameIncomeCategory(id: number, name: string): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  assertUniqueName(await client.incomeCategory.findMany({select: {id: true, name: true}}), clean, rowId);
  const updated = await client.incomeCategory.update({where: {id: rowId}, data: {name: clean}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return updated;
}

export async function deleteIncomeCategory(id: number): Promise<void> {
  try {
    await client.incomeCategory.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "category");
  }
  revalidateLookupSurfaces();
}

// --- Supplier ---------------------------------------------------------------

export async function createSupplier(name: string, categoryId: number): Promise<FilterOption> {
  const clean = cleanName(name);
  const catId = cleanPositiveId(categoryId);
  assertUniqueName(await client.supplier.findMany({select: {id: true, name: true}}), clean);
  const created = await client.supplier.create({data: {name: clean, categoryId: catId}, select: {id: true, name: true}});
  revalidateLookupSurfaces();
  return created;
}

export async function updateSupplier(id: number, name: string, categoryId: number): Promise<FilterOption> {
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  const catId = cleanPositiveId(categoryId);
  assertUniqueName(await client.supplier.findMany({select: {id: true, name: true}}), clean, rowId);
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
    await client.supplier.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "supplier");
  }
  revalidateLookupSurfaces();
}

// --- Frequency --------------------------------------------------------------
// Frequency has no autoincrement id (manual @id) plus value (billings per year) and
// isRecurring. Settings-only — never offered inline. New rows get max(id)+1.

function cleanFrequencyValue(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Value must be a whole number of billings per year (0 for one-time).");
  }
  return value;
}

export async function createFrequency(name: string, value: number, isRecurring: boolean): Promise<FilterOption> {
  const clean = cleanName(name);
  const perYear = cleanFrequencyValue(value);
  assertUniqueName(await client.frequency.findMany({select: {id: true, name: true}}), clean);
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
  const rowId = cleanPositiveId(id);
  const clean = cleanName(name);
  const perYear = cleanFrequencyValue(value);
  assertUniqueName(await client.frequency.findMany({select: {id: true, name: true}}), clean, rowId);
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
    await client.frequency.delete({where: {id: cleanPositiveId(id)}});
  } catch (error) {
    throw toDeleteError(error, "frequency");
  }
  revalidateLookupSurfaces();
}
