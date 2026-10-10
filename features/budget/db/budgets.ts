import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";
import {computeActuals, type BudgetMemberIds} from "@/features/budget/db/budgetActuals";
import {computeInverseTotal, type ClaimSource} from "@/features/budget/db/budgetInverse";
import {allocatedInWindow, getIncomeStreams, incomeInWindow, type Allocation} from "@/features/budget/db/budgetIncomeTarget";
import {facetSelectionFromMembers, getSelectorTotals, hasAnySelector} from "@/features/budget/db/budgetSmartMatch";
import {resolveActivePeriod, windowMonthsFor, type BudgetPeriodType} from "@/features/budget/period";

// Read side for the Budget page. Each budget carries its members, period config, and per-instance
// overrides; actuals + the effective target are resolved for the budget's CURRENT period (each
// card shows its own window — there is no global navigator).

export type BudgetMemberType = "itemCategory" | "supplierCategory" | "supplier" | "contractCategory" | "tag";

// `color` is set only for tag members, so the card can render them as colored TagChips.
// `isExcluded` flips the selector's sign: an excluded value is carved OUT of the budget.
export type BudgetMemberView = {type: BudgetMemberType; id: number; name: string; color?: string; isExcluded: boolean};

export type BudgetOverrideView = {periodKey: string; amount: number};

export type BudgetView = {
  id: number;
  name: string;
  amount: number; // target per period (or total cap for RANGE / OPEN)
  periodType: BudgetPeriodType;
  anchorMonth: number | null;
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  // Catch-all budget: no members, counts whatever no other budget of this account claims.
  isInverse: boolean;
  // Target = the income of the budget's own window, not `amount`.
  targetFromIncome: boolean;
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
  // Only for a targetFromIncome budget: the two halves its target is made of, so the card can show
  // where the number came from.
  derivedTarget?: {income: number; allocated: number};
};

export type BudgetMemberOptions = {
  itemCategories: FilterOption[];
  supplierCategories: FilterOption[];
  suppliers: FilterOption[];
  contractCategories: FilterOption[];
  tags: TagOption[];
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
  tagId: number | null;
  tag: {name: string; color: string} | null;
  isExcluded: boolean;
}): BudgetMemberView | null {
  const sign = {isExcluded: member.isExcluded};
  if (member.itemCategoryId != null && member.itemCategory) {
    return {type: "itemCategory", id: member.itemCategoryId, name: member.itemCategory.name, ...sign};
  }
  if (member.supplierCategoryId != null && member.supplierCategory) {
    return {type: "supplierCategory", id: member.supplierCategoryId, name: member.supplierCategory.name, ...sign};
  }
  if (member.supplierId != null && member.supplier) {
    return {type: "supplier", id: member.supplierId, name: member.supplier.name, ...sign};
  }
  if (member.contractCategoryId != null && member.contractCategory) {
    return {type: "contractCategory", id: member.contractCategoryId, name: member.contractCategory.name, ...sign};
  }
  if (member.tagId != null && member.tag) {
    return {type: "tag", id: member.tagId, name: member.tag.name, color: member.tag.color, ...sign};
  }
  return null;
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
          tag: {select: {name: true, color: true}},
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
      isInverse: budget.isInverse,
      targetFromIncome: budget.targetFromIncome,
      workspaceId: budget.workspaceId,
      workspace: {id: budget.workspace.id, name: budget.workspace.name, color: budget.workspace.color},
      members,
      memberIds: facetSelectionFromMembers(budget.members),
      overrides: budget.overrides.map((o) => ({periodKey: o.periodKey, amount: Number(o.amount)})),
    };
  });
}

// Resolve every budget for its current period: window, effective target (override on the current
// periodKey else the default), and actual spend.
export async function getBudgetsResolved(now: Date = new Date(), workspaceId?: number | null): Promise<BudgetResolved[]> {
  const budgets = await getBudgets(workspaceId);
  // Selector totals (fetched once) let the matcher treat "every value selected" as no constraint.
  const totals = await getSelectorTotals();
  // Income streams only matter to budgets pegged to income — skip the query when none is.
  const incomeStreams = budgets.some((budget) => budget.targetFromIncome)
    ? await getIncomeStreams(workspaceId)
    : [];
  const periods = budgets.map((budget) => resolveActivePeriod(budget, now));

  // An inverse budget subtracts what the OTHER budgets of its own account claim. `budgets` already
  // holds them (the list is either scoped to one account or holds them all), so no extra query.
  const claimSources: ClaimSource[] = budgets.map((budget) => ({
    periodType: budget.periodType,
    anchorMonth: budget.anchorMonth,
    startDate: budget.startDate,
    endDate: budget.endDate,
    memberIds: budget.memberIds,
    isInverse: budget.isInverse,
  }));

  const actuals = await Promise.all(
    budgets.map((budget, index) => {
      const {start, end} = periods[index];
      const windowMonths = windowMonthsFor(budget.periodType, start, end);
      if (budget.isInverse) {
        const others = claimSources.filter(
          (_, otherIndex) => budgets[otherIndex].workspaceId === budget.workspaceId && otherIndex !== index,
        );
        return computeInverseTotal(others, {start, end}, budget.workspaceId, windowMonths, now, totals);
      }
      return computeActuals(budget.memberIds, start, end, budget.workspaceId, windowMonths, now, totals);
    }),
  );

  // Pass one: every target that stands on its own. An override is a number the user typed for this
  // exact window, so it always wins; otherwise it's the budget's own amount. Income-pegged budgets
  // are filled in afterwards, because they are defined in terms of these.
  const ownTargets = budgets.map((budget, index) => {
    const override = budget.overrides.find((o) => o.periodKey === periods[index].key);
    return override ? override.amount : budget.amount;
  });

  return budgets.map((budget, index) => {
    const period = periods[index];
    const window = {start: period.start, end: period.end};
    const hasOverride = budget.overrides.some((o) => o.periodKey === period.key);
    // Pass two: the remainder. Income arriving in this window minus what the other budgets of this
    // account allocate out of it — only inverse budgets can ask for this, so it never recurses.
    const derived =
      budget.targetFromIncome && !hasOverride
        ? {
            income: incomeInWindow(
              incomeStreams,
              budget.workspaceId,
              window,
              windowMonthsFor(budget.periodType, period.start, period.end),
              now,
            ),
            allocated: allocatedInWindow(
              budgets.flatMap((other, otherIndex): Allocation[] =>
                other.workspaceId !== budget.workspaceId || otherIndex === index
                  ? []
                  : [{
                      periodType: other.periodType,
                      anchorMonth: other.anchorMonth,
                      startDate: other.startDate,
                      endDate: other.endDate,
                      target: ownTargets[otherIndex],
                      isInverse: other.isInverse,
                      claimsAnything: hasAnySelector(other.memberIds),
                    }],
              ),
              window,
            ),
          }
        : null;

    return {
      ...budget,
      periodKey: period.key,
      windowStart: period.start ? period.start.toISOString() : null,
      windowEnd: period.end ? period.end.toISOString() : null,
      target: derived ? derived.income - derived.allocated : ownTargets[index],
      actual: actuals[index],
      ...(derived ? {derivedTarget: derived} : {}),
    };
  });
}

export async function getBudgetMemberOptions(): Promise<BudgetMemberOptions> {
  const [itemCategories, supplierCategories, suppliers, contractCategories, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.itemCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplierCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.supplier.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.contractCategory.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);
  return {
    itemCategories,
    supplierCategories,
    suppliers,
    contractCategories,
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}

export async function getBudgetCount(): Promise<number> {
  return client.budget.count();
}
