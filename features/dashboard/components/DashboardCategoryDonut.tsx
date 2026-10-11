import {getTranslations} from "next-intl/server";
import HalfDonutCard from "@/features/dashboard/components/HalfDonutCard";
import {getItemCategoryBreakdown} from "@/features/expense/variable/db/categoryBreakdown";
import {chartWindow, type Granularity, notBefore, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {getAnalysisStart} from "@/features/settings/db/appSettings";

// Dashboard half-donut #1: where variable spending goes, by item category, scoped to the period
// selected in the dashboard toolbar (active account).
export default async function DashboardCategoryDonut({
  workspaceId,
  granularity,
  offset,
}: {workspaceId?: number | null; granularity: Granularity; offset: number}) {
  const t = await getTranslations("categoryChart");
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const period = chartWindow(granularity, offset, today);
  const window = {...period, start: notBefore(period.start, await getAnalysisStart())};
  const rows = await getItemCategoryBreakdown({workspaceId: workspaceId ?? undefined}, window);
  return <HalfDonutCard title={t("title")} rows={rows}/>;
}
