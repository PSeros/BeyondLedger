import type {Prisma} from "@/prisma/generated/client";
import type {LifecycleStatus} from "@/lib/status";

export type IncomeFilters = {
  q?: string;
  // The fixed/variable tab discriminator: recurring frequencies (Monthly/Quarterly/Yearly) are
  // "fixed" income, the non-recurring "One-time" frequency is "variable". A single Income table,
  // filtered by Frequency.isRecurring, backs both tabs.
  isRecurring?: boolean;
  sourceId?: number;
  categoryId?: number;
  // Fixed tab only (the variable tab is always the One-time frequency).
  frequencyId?: number;
  // Match income carrying ANY of these tag ids. Empty/undefined = no filter.
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
function buildStatusWhere(status: LifecycleStatus): Prisma.IncomeWhereInput {
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

// Shared where-builder so table, chart and top-k queries filter identically (mirrors the expense
// domains' billWhere/contractWhere).
export function buildIncomeWhere({
  q,
  isRecurring,
  sourceId,
  categoryId,
  frequencyId,
  tagIds,
  status,
  dateFrom,
  dateTo,
}: IncomeFilters = {}): Prisma.IncomeWhereInput {
  const clauses: Prisma.IncomeWhereInput[] = [];

  const search = q?.trim();
  if (search) {
    clauses.push({
      OR: [
        {name: {contains: search}},
        {source: {name: {contains: search}}},
        {category: {name: {contains: search}}},
      ],
    });
  }

  if (isRecurring != null) {
    clauses.push({frequency: {isRecurring}});
  }

  if (sourceId != null) {
    clauses.push({sourceId});
  }

  if (categoryId != null) {
    clauses.push({categoryId});
  }

  if (frequencyId != null) {
    clauses.push({frequencyId});
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
