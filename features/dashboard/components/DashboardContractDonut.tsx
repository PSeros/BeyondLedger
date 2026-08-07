import {getTranslations} from "next-intl/server";
import HalfDonutCard from "@/features/dashboard/components/HalfDonutCard";
import {getContractCategoryMonthly} from "@/features/expense/fixed/db/contractCategoryData";

// Dashboard half-donut #2: monthly fixed costs by contract category — active recurring contracts,
// each normalized to a monthly figure (see getContractCategoryMonthly). Active account only.
export default async function DashboardContractDonut({workspaceId}: {workspaceId?: number | null}) {
  const t = await getTranslations("categoryChart");
  const rows = await getContractCategoryMonthly({workspaceId: workspaceId ?? undefined});
  return <HalfDonutCard title={t("monthlyFixedTitle")} rows={rows}/>;
}
