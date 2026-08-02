import type {Prisma} from "@/prisma/generated/client";

export type IncomeFilters = {
  q?: string;
  // The fixed/variable tab discriminator: recurring frequencies (Monthly/Quarterly/Yearly) are
  // "fixed" income, the non-recurring "One-time" frequency is "variable". A single Income table,
  // filtered by Frequency.isRecurring, backs both tabs.
  isRecurring?: boolean;
};

// Shared where-builder so table, chart and top-k queries filter identically (mirrors the expense
// domains' billWhere/contractWhere). Kept an object so later phases can add source/category/
// frequency/status/date clauses without touching call sites.
export function buildIncomeWhere({q, isRecurring}: IncomeFilters = {}): Prisma.IncomeWhereInput {
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

  if (clauses.length === 0) {
    return {};
  }

  return {AND: clauses};
}
