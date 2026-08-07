import {getTranslations} from "next-intl/server";
import HalfDonutCard from "@/features/dashboard/components/HalfDonutCard";
import {getItemCategoryBreakdown} from "@/features/expense/variable/db/categoryBreakdown";

// Dashboard half-donut #1: where variable spending goes, by item category (all-time, active account).
export default async function DashboardCategoryDonut({workspaceId}: {workspaceId?: number | null}) {
  const t = await getTranslations("categoryChart");
  const rows = await getItemCategoryBreakdown({workspaceId: workspaceId ?? undefined});
  return <HalfDonutCard title={t("title")} rows={rows}/>;
}
