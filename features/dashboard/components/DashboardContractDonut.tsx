import {getTranslations} from "next-intl/server";
import HalfDonutCard from "@/features/dashboard/components/HalfDonutCard";
import {getContractCategorySpend} from "@/features/expense/fixed/db/contractCategoryData";
import {chartWindow, type Granularity, notBefore, utcDate} from "@/features/expense/shared/db/cumulativeChart";
import {getAnalysisStart} from "@/features/settings/db/appSettings";

// Dashboard half-donut #2: fixed costs by contract category actually incurred in the period selected
// in the dashboard toolbar — recurring billing occurrences plus one-time charges that land in the
// window (see getContractCategorySpend). Active account only.
export default async function DashboardContractDonut({
  workspaceId,
  granularity,
  offset,
}: {workspaceId?: number | null; granularity: Granularity; offset: number}) {
  const t = await getTranslations("categoryChart");
  const now = new Date();
  const today = utcDate(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const period = chartWindow(granularity, offset, today);
  const window = {...period, start: notBefore(period.start, await getAnalysisStart())};
  const rows = await getContractCategorySpend({workspaceId: workspaceId ?? undefined}, window);
  return <HalfDonutCard title={t("monthlyFixedTitle")} rows={rows}/>;
}
