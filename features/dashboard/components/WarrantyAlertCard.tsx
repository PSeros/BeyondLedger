import {getTranslations} from "next-intl/server";
import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getExpiringWarranties} from "@/features/dashboard/db/warrantyExpiry";

// Dashboard headline widget (Phase 12): line-item warranties whose coverage (bill date + warranty
// months) ends within `withinDays` (from AppSettings.warrantyWarnDays). Reuses UpcomingDueCard —
// the supplier rides in the `frequency` chip slot for context, and rows link to the parent bill.
type WarrantyAlertCardProps = {
  withinDays: number;
  workspaceId?: number | null;
};

export default async function WarrantyAlertCard({withinDays, workspaceId}: WarrantyAlertCardProps) {
  const t = await getTranslations("dashboard");
  const rows = await getExpiringWarranties({withinDays, workspaceId});

  // Only surface the alert when something is actually expiring — no coverage ending soon means no
  // card at all (the parent's flex `gap` collapses cleanly since this renders nothing).
  if (rows.length === 0) {
    return null;
  }

  return (
    <UpcomingDueCard
      title={t("warrantyTitle", {days: withinDays})}
      rows={rows.map((row) => ({
        id: row.id,
        linkId: row.linkId,
        label: row.label,
        amount: row.amount,
        dueDate: row.dueDate,
        frequency: row.supplier,
      }))}
      windowDays={withinDays}
      basePath="/expense/variable"
    />
  );
}
