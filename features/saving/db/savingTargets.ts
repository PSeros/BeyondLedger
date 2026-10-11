import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

export async function getSavingTargets(): Promise<FilterOption[]> {
  return client.savingTarget.findMany({select: {id: true, name: true}, orderBy: {name: "asc"}});
}
