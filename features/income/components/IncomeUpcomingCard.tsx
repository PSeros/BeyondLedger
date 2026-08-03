import {getTranslations} from "next-intl/server";
import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedIncome} from "@/features/income/db/incomeUpcomingData";
import type {IncomeFilters} from "@/features/income/db/incomeWhere";

// Fixed (recurring) tab only. Restricts to Active recurring income by nature, so status/date range
// and the tab discriminator don't apply here.
type IncomeUpcomingCardProps = Omit<IncomeFilters, "status" | "dateFrom" | "dateTo" | "isRecurring">;

export default async function IncomeUpcomingCard(filters: IncomeUpcomingCardProps) {
  const t = await getTranslations("upcoming");
  const rows = await getUpcomingFixedIncome({...filters, withinDays: 30});

  return (
    <UpcomingDueCard
      title={t("titleDays", {days: 30})}
      rows={rows}
      windowDays={30}
      basePath="/income/fixed"
    />
  );
}
