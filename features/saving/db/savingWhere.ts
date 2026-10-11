import type {Prisma} from "@/prisma/generated/client";
import type {LifecycleStatus} from "@/lib/status";

export type SavingFilters = {
  q?: string;
  // Tab discriminator: recurring = savings plans (fixed), One-time = deposits/withdrawals (variable).
  isRecurring?: boolean;
  targetId?: number;
  // Fixed tab only (the variable tab is always the One-time frequency).
  frequencyId?: number;
  // The active account (Workspace). Single value → equality. Undefined = "All accounts".
  workspaceId?: number;
  // Match saving carrying ANY of these tag ids. Empty/undefined = no filter.
  tagIds?: number[];
  // Fixed tab only. Lifecycle status is derived from startDate/endDate (see determineStatus),
  // not stored, so it's expressed here as date clauses.
  status?: LifecycleStatus;
  // Variable tab only: ISO calendar dates (yyyy-mm-dd), inclusive, over the occurrence startDate.
  dateFrom?: string;
  dateTo?: string;
};

// Mirror determineStatus() as SQL-able date clauses, start-of-day boundaries, so the classification
// matches the computed status shown in the table.
function buildStatusWhere(status: LifecycleStatus): Prisma.SavingWhereInput {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  switch (status) {
    case "Pending":
      return {startDate: {gte: startOfTomorrow}};
    case "Inactive":
      return {endDate: {lt: startOfToday}};
    case "Active":
    default:
      return {
        startDate: {lt: startOfTomorrow},
        OR: [{endDate: null}, {endDate: {gte: startOfToday}}],
      };
  }
}

// Shared where-builder so table, chart and target-balance queries filter identically.
export function buildSavingWhere({
  q,
  isRecurring,
  targetId,
  frequencyId,
  workspaceId,
  tagIds,
  status,
  dateFrom,
  dateTo,
}: SavingFilters = {}): Prisma.SavingWhereInput {
  const clauses: Prisma.SavingWhereInput[] = [];

  const search = q?.trim();
  if (search) {
    clauses.push({
      OR: [
        {name: {contains: search}},
        {target: {name: {contains: search}}},
      ],
    });
  }

  if (isRecurring != null) {
    clauses.push({frequency: {isRecurring}});
  }

  if (targetId != null) {
    clauses.push({targetId});
  }

  if (frequencyId != null) {
    clauses.push({frequencyId});
  }

  if (workspaceId != null) {
    clauses.push({workspaceId});
  }

  if (tagIds != null && tagIds.length > 0) {
    clauses.push({tags: {some: {tagId: {in: tagIds}}}});
  }

  if (status != null) {
    clauses.push(buildStatusWhere(status));
  }

  const dateClause: Prisma.DateTimeFilter = {};
  if (dateFrom) {
    dateClause.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    dateClause.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }
  if (dateClause.gte || dateClause.lte) {
    clauses.push({startDate: dateClause});
  }

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
