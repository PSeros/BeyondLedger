import type {Prisma} from "@/prisma/generated/client";
import type {LifecycleStatus} from "@/lib/status";

export type ContractFilters = {
  q?: string;
  supplierId?: number;
  categoryId?: number;
  frequencyId?: number;
  // The active account (Workspace). Single value → equality. Undefined = "All accounts".
  workspaceId?: number;
  // Match contracts carrying ANY of these tag ids. Empty/undefined = no filter.
  tagIds?: number[];
  // Lifecycle status is derived from startDate/endDate (see determineStatus), not stored,
  // so it's expressed here as date clauses. Deliberately NOT applied to the chart/upcoming
  // queries, which already restrict to Active contracts by nature.
  status?: LifecycleStatus;
};

// Mirror determineStatus() as SQL-able date clauses, using start-of-day boundaries so the
// classification matches the computed status shown in the table.
function buildStatusWhere(status: LifecycleStatus): Prisma.ContractWhereInput {
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

export function buildContractWhere({
  q,
  supplierId,
  categoryId,
  frequencyId,
  workspaceId,
  tagIds,
  status,
}: ContractFilters = {}): Prisma.ContractWhereInput {
  const clauses: Prisma.ContractWhereInput[] = [];

  const search = q?.trim();
  if (search) {
    clauses.push({
      OR: [
        {name: {contains: search}},
        {supplier: {name: {contains: search}}},
        {category: {name: {contains: search}}},
        {documentNumber: {contains: search}},
      ],
    });
  }

  if (supplierId != null) {
    clauses.push({supplierId});
  }

  if (categoryId != null) {
    clauses.push({categoryId});
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

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
