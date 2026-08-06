import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";
import {computeActuals, type BudgetMemberIds} from "@/features/budget/db/budgetActuals";
import {resolveActivePeriod, type BudgetPeriodType} from "@/features/budget/period";

// Read side for the Budget page. Each budget carries its members, period config, and per-instance
// overrides; actuals + the effective target are resolved for the budget's CURRENT period (each
// card shows its own window — there is no global navigator).

export type BudgetMemberType = "itemCategory" | "supplierCategory" | "supplier" | "contractCategory";

export type BudgetMemberView = {type: BudgetMemberType; id: number; name: string};

export type BudgetOverrideView = {periodKey: string; amount: number};

export type BudgetView = {
  id: number;
  name: string;
  amount: number; // target per period (or total cap for RANGE / OPEN)
  periodType: BudgetPeriodType;
  anchorMonth: number | null;
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  workspaceId: number;
  workspace: WorkspaceOption;
  members: BudgetMemberView[];
  memberIds: BudgetMemberIds;
  overrides: BudgetOverrideView[];
};

// A budget resolved for its current period: window bounds (ISO, null = unbounded), the periodKey,
// the effective target (override or default), and the actual spend in the window.
export type BudgetResolved = BudgetView & {
  periodKey: string;
  windowStart: string | null;
  windowEnd: string | null;
  target: number;
  actual: number;
};

export type BudgetMemberOptions = {
  itemCategories: FilterOption[];
  supplierCategories: FilterOption[];
  suppliers: FilterOption[];
  contractCategories: FilterOption[];
  workspaces: WorkspaceOption[];
  // The account a NEW budget defaults to (the edit form overrides with the budget's own account).
  defaultWorkspaceId: string;
};

function toMemberView(member: {
  itemCategoryId: number | null;
  itemCategory: {name: string} | null;
  supplierCategoryId: number | null;
  supplierCategory: {name: string} | null;
  supplierId: number | null;
  supplier: {name: string} | null;
  contractCategoryId: number | null;
  contractCategory: {name: string} | null;
}): BudgetMemberView | null {
  if (member.itemCategoryId != null && member.itemCategory) {
    return {type: "itemCategory", id: member.itemCategoryId, name: member.itemCategory.name};
  }
  if (member.supplierCategoryId != null && member.supplierCategory) {
    return {type: "supplierCategory", id: member.supplierCategoryId, name: member.supplierCategory.name};
  }
  if (member.supplierId != null && member.supplier) {
    return {type: "supplier", id: member.supplierId, name: member.supplier.name};
  }
  if (member.contractCategoryId != null && member.contractCategory) {
    return {type: "contractCategory", id: member.contractCategoryId, name: member.contractCategory.name};
  }
  return null;
}

function toMemberIds(members: BudgetMemberView[]): BudgetMemberIds {
  return {
    itemCategoryIds: members.filter((m) => m.type === "itemCategory").map((m) => m.id),
    supplierCategoryIds: members.filter((m) => m.type === "supplierCategory").map((m) => m.id),
    supplierIds: members.filter((m) => m.type === "supplier").map((m) => m.id),
    contractCategoryIds: members.filter((m) => m.type === "contractCategory").map((m) => m.id),
  };
}

// `workspaceId` (the active account) filters the list to that account; null/undefined = all accounts.
export async function getBudgets(workspaceId?: number | null): Promise<BudgetView[]> {
  const budgets = await client.budget.findMany({
    where: workspaceId != null ? {workspaceId} : undefined,
    orderBy: {createdAt: "asc"},
    include: {
      workspace: true,
      members: {
        include: {
          itemCategory: {select: {name: true}},
          supplierCategory: {select: {name: true}},
          supplier: {select: {name: true}},
          contractCategory: {select: {name: true}},
        },
      },
      overrides: {select: {periodKey: true, amount: true}},
    },
  });

  return budgets.map((budget) => {
    const members = budget.members
      .map(toMemberView)
      .filter((m): m is BudgetMemberView => m !== null);
    return {
      id: budget.id,
      name: budget.name,
      amount: Number(budget.amount),
      periodType: budget.periodType as BudgetPeriodType,
      anchorMonth: budget.anchorMonth,
      startDate: budget.startDate ? budget.startDate.toISOString() : null,
      endDate: budget.endDate ? budget.endDate.toISOString() : null,
      workspaceId: budget.workspaceId,
      workspace: {id: budget.workspace.id, name: budget.workspace.name, color: budget.workspace.color},
      members,
      memberIds: toMemberIds(members),
      overrides: budget.overrides.map((o) => ({periodKey: o.periodKey, amount: Number(o.amount)})),
    };
  });
}

// Resolve every budget for its current period: window, effective target (override on the current
// periodKey else the default), and actual spend.
export async function getBudgetsResolved(now: Date = new Date(), workspaceId?: number | null): Promise<BudgetResolved[]> {
  const budgets = await getBudgets(workspaceId);
  const periods = budgets.map((budget) => resolveActivePeriod(budget, now));
  const actuals = await Promise.all(
    budgets.map((budget, index) =>
      computeActuals(budget.memberIds, periods[index].start, periods[index].end, budget.workspaceId),
    ),
  );

  return budgets.map((budget, index) => {
    const period = periods[index];
    const override = budget.overrides.find((o) => o.periodKey === period.key);
    return {
      ...budget,
      periodKey: period.key,
      windowStart: period.start ? period.start.toISOString() : null,
      windowEnd: period.end ? period.end.toISOString() : null,
      target: override ? override.amount : budget.amount,
      actual: actuals[index],
    };
  });
}

export async function getBudgetMemberOptions(): Promise<BudgetMemberOptions> {
  const [itemCategories, supplierCategories, suppliers, contractCategories, workspaces, activeWorkspaceId] = await Promise.all([
    client.itemCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);
  return {
    itemCategories,
    supplierCategories,
    suppliers,
    contractCategories,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}

export async function getBudgetCount(): Promise<number> {
  return client.budget.count();
}
