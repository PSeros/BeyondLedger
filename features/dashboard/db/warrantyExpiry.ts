import {client} from "@/lib/prisma";
import {addDays, addMonths, utcDate} from "@/features/expense/shared/db/cumulativeChart";

// Dashboard "warranties about to expire" alert (Phase 12). Warranty is stored per line item as a
// number of MONTHS (`Item.warranty`), not an expiry date — so expiry is derived here as
// (parent bill's purchase date) + warranty months, then filtered to the [today, today+withinDays]
// window. `withinDays` comes from the AppSettings.warrantyWarnDays preference.

export type WarrantyExpiryRow = {
  id: number; // itemId — unique React key
  linkId: number; // billId — the detail the row links to
  label: string; // item name
  amount: number; // item total price
  dueDate: string; // ISO expiry date
  supplier: string; // supplier name, shown as a context chip
};

type GetExpiringWarrantiesInput = {
  withinDays: number;
  // The active account (Workspace). null/undefined = all accounts (no filter) — mirrors billWhere.
  workspaceId?: number | null;
};

export async function getExpiringWarranties({
  withinDays,
  workspaceId,
}: GetExpiringWarrantiesInput): Promise<WarrantyExpiryRow[]> {
  const items = await client.item.findMany({
    where: {
      warranty: {not: null},
      ...(workspaceId != null ? {bill: {is: {workspaceId}}} : {}),
    },
    select: {
      id: true,
      name: true,
      totalPrice: true,
      warranty: true,
      billId: true,
      bill: {select: {date: true, supplier: {select: {name: true}}}},
    },
  });

  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const horizon = addDays(today, withinDays);

  const rows: WarrantyExpiryRow[] = [];

  for (const item of items) {
    if (item.warranty == null) continue;

    const purchase = item.bill.date;
    const expiry = addMonths(
      utcDate(purchase.getUTCFullYear(), purchase.getUTCMonth(), purchase.getUTCDate()),
      item.warranty,
    );

    // Only warranties still active but expiring within the window. Already-expired warranties drop
    // out (expiry < today) — the alert is about acting before coverage ends, not a history log.
    if (expiry < today || expiry > horizon) continue;

    rows.push({
      id: item.id,
      linkId: item.billId,
      label: item.name,
      amount: Number(item.totalPrice),
      dueDate: expiry.toISOString(),
      supplier: item.bill.supplier.name,
    });
  }

  return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
