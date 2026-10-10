"use server";

import {revalidatePath} from "next/cache";
import {getTranslations} from "next-intl/server";
import {client} from "@/lib/prisma";
import {BUDGET_PERIOD_TYPES, type BudgetPeriodType} from "@/features/budget/period";
import {parseWorkspaceId} from "@/features/workspaces/workspaceFormData";
import {nudge} from "@/features/integrations/mqtt/runtime";

// Server actions for the Budget page: create/update/delete a budget (name + period + target +
// members), and set/clear a per-period override. Mirrors referenceDataMutations.ts (localized
// errors, revalidatePath). Members are posted as repeated hidden inputs, one per selected id.

function revalidateBudget(): void {
  revalidatePath("/budget");
  // Budgets are published to Home Assistant; nudge is a no-op when the bridge is off.
  nudge("budget");
}

async function cleanName(name: FormDataEntryValue | null): Promise<string> {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed === "") {
    const t = await getTranslations("errors");
    throw new Error(t("nameRequired"));
  }
  return trimmed;
}

// The stored target. A budget pegged to its period's income doesn't have one — the column is
// non-null, so it keeps a 0 that nothing reads (see getBudgetsResolved) — and the field is hidden in
// the form, so an empty value must not fail validation there.
async function cleanAmount(raw: FormDataEntryValue | null, targetFromIncome: boolean): Promise<number> {
  if (targetFromIncome) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    const t = await getTranslations("errors");
    throw new Error(t("invalidAmount"));
  }
  return amount;
}

// Checkbox-style flags: the form mirrors them into a hidden input that only exists when set.
function parseFlag(raw: FormDataEntryValue | null): boolean {
  return raw === "1";
}

async function cleanPositiveId(id: number): Promise<number> {
  if (!Number.isInteger(id) || id <= 0) {
    const t = await getTranslations("errors");
    throw new Error(t("invalidId"));
  }
  return id;
}

function parsePeriodType(raw: FormDataEntryValue | null): BudgetPeriodType {
  return typeof raw === "string" && (BUDGET_PERIOD_TYPES as string[]).includes(raw)
    ? (raw as BudgetPeriodType)
    : "MONTHLY";
}

function parseDate(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// The period-specific fields (anchorMonth / startDate / endDate), validated for the chosen type;
// irrelevant fields are nulled so switching a budget's type clears stale values.
async function parsePeriodFields(
  formData: FormData,
  periodType: BudgetPeriodType,
): Promise<{anchorMonth: number | null; startDate: Date | null; endDate: Date | null}> {
  const t = await getTranslations("errors");

  if (periodType === "MONTH_OF_YEAR") {
    const month = Number(formData.get("anchorMonth"));
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(t("budgetMonthRequired"));
    }
    return {anchorMonth: month, startDate: null, endDate: null};
  }

  if (periodType === "RANGE") {
    const startDate = parseDate(formData.get("startDate"));
    const endDate = parseDate(formData.get("endDate"));
    if (!startDate || !endDate) {
      throw new Error(t("budgetRangeRequired"));
    }
    if (endDate < startDate) {
      throw new Error(t("budgetRangeOrder"));
    }
    return {anchorMonth: null, startDate, endDate};
  }

  return {anchorMonth: null, startDate: null, endDate: null};
}

type MemberColumn = "itemCategoryId" | "supplierCategoryId" | "supplierId" | "contractCategoryId" | "tagId";
type MemberCreate = {[K in MemberColumn]?: number} & {isExcluded: boolean};

// Members arrive as repeated hidden inputs, one per picked id: `memberItemCategoryId` for included
// values and `excludeItemCategoryId` for excluded ones, and so on per selector.
function parseMembers(formData: FormData): MemberCreate[] {
  const collect = (key: string): number[] =>
    formData
      .getAll(key)
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);

  const fields: {suffix: string; column: MemberColumn}[] = [
    {suffix: "ItemCategoryId", column: "itemCategoryId"},
    {suffix: "SupplierCategoryId", column: "supplierCategoryId"},
    {suffix: "SupplierId", column: "supplierId"},
    {suffix: "ContractCategoryId", column: "contractCategoryId"},
    {suffix: "TagId", column: "tagId"},
  ];

  return fields.flatMap(({suffix, column}) =>
    ([
      ["member", false],
      ["exclude", true],
    ] as const).flatMap(([prefix, isExcluded]) =>
      collect(`${prefix}${suffix}`).map((id): MemberCreate => ({[column]: id, isExcluded})),
    ),
  );
}

// An inverse (catch-all) budget is defined by the absence of selectors, so any that were posted are
// dropped — the two models would otherwise contradict each other. targetFromIncome is only offered
// for inverse budgets in the form; it is stored as posted either way.
function parseFlags(formData: FormData): {isInverse: boolean; targetFromIncome: boolean} {
  const isInverse = parseFlag(formData.get("isInverse"));
  return {isInverse, targetFromIncome: isInverse && parseFlag(formData.get("targetFromIncome"))};
}

export async function createBudget(formData: FormData): Promise<void> {
  const name = await cleanName(formData.get("name"));
  const flags = parseFlags(formData);
  const amount = await cleanAmount(formData.get("amount"), flags.targetFromIncome);
  const periodType = parsePeriodType(formData.get("periodType"));
  const period = await parsePeriodFields(formData, periodType);
  const members = flags.isInverse ? [] : parseMembers(formData);
  const workspaceId = parseWorkspaceId(formData);

  await client.budget.create({
    data: {name, amount, periodType, ...period, ...flags, workspaceId, members: {create: members}},
  });
  revalidateBudget();
}

export async function updateBudget(id: number, formData: FormData): Promise<void> {
  const budgetId = await cleanPositiveId(id);
  const name = await cleanName(formData.get("name"));
  const flags = parseFlags(formData);
  const amount = await cleanAmount(formData.get("amount"), flags.targetFromIncome);
  const periodType = parsePeriodType(formData.get("periodType"));
  const period = await parsePeriodFields(formData, periodType);
  const members = flags.isInverse ? [] : parseMembers(formData);
  const workspaceId = parseWorkspaceId(formData);

  await client.$transaction([
    client.budgetMember.deleteMany({where: {budgetId}}),
    client.budget.update({
      where: {id: budgetId},
      data: {name, amount, periodType, ...period, ...flags, workspaceId, members: {create: members}},
    }),
  ]);
  revalidateBudget();
}

export async function deleteBudget(id: number): Promise<void> {
  await client.budget.delete({where: {id: await cleanPositiveId(id)}});
  revalidateBudget();
}

// Override the target for one specific period instance (identified by its periodKey). Upserts on
// the compound unique.
export async function setBudgetOverride(budgetId: number, periodKey: string, amount: number): Promise<void> {
  const id = await cleanPositiveId(budgetId);
  if (!Number.isFinite(amount) || amount <= 0) {
    const t = await getTranslations("errors");
    throw new Error(t("invalidAmount"));
  }
  await client.budgetOverride.upsert({
    where: {budgetId_periodKey: {budgetId: id, periodKey}},
    create: {budgetId: id, periodKey, amount},
    update: {amount},
  });
  revalidateBudget();
}

export async function clearBudgetOverride(budgetId: number, periodKey: string): Promise<void> {
  await client.budgetOverride.deleteMany({where: {budgetId: await cleanPositiveId(budgetId), periodKey}});
  revalidateBudget();
}
