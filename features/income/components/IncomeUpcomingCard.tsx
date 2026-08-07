import {getTranslations} from "next-intl/server";
import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedIncome} from "@/features/income/db/incomeUpcomingData";
import type {IncomeFilters} from "@/features/income/db/incomeWhere";

// Fixed (recurring) tab only. Restricts to Active recurring income by nature, so status/date range
// and the tab discriminator don't apply here.
type IncomeUpcomingCardProps = Omit<IncomeFilters, "status" | "dateFrom" | "dateTo" | "isRecurring"> & {
  withinDays?: number;
};

export default async function IncomeUpcomingCard({withinDays = 30, ...filters}: IncomeUpcomingCardProps) {
  const t = await getTranslations("upcoming");
  const rows = await getUpcomingFixedIncome({...filters, withinDays});

  return (
    <UpcomingDueCard
      title={t("titleIncomeDays", {days: withinDays})}
      rows={rows}
      windowDays={withinDays}
      basePath="/income/fixed"
    />
  );
}
