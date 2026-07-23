import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";

export type BillFormOptions = {
  suppliers: FilterOption[];
};

// Unlike the filter options (scoped to suppliers already used by bills), the edit form must
// offer every supplier so a bill can be reassigned to any of them. Supplier is the only
// editable relation on a Bill's top-level fields — item categories live on the nested items.
export async function getBillFormOptions(): Promise<BillFormOptions> {
  const suppliers = await client.supplier.findMany({
    select: {id: true, name: true},
    orderBy: {name: "asc"},
  });

  return {suppliers};
}
