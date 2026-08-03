import {getTranslations} from "next-intl/server";
import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedExpenses} from "@/features/expense/fixed/db/contractUpcomingData";
import type {ContractFilters} from "@/features/expense/fixed/db/contractWhere";

type ContractUpcomingCardProps = Omit<ContractFilters, "status">;

export default async function ContractUpcomingCard(filters: ContractUpcomingCardProps) {
  const t = await getTranslations("upcoming");
  const rows = await getUpcomingFixedExpenses({...filters, withinDays: 30});

  return (
    <UpcomingDueCard
      title={t("titleDays", {days: 30})}
      rows={rows}
      windowDays={30}
      hrefForRow={(id) => `/expense/fixed/${id}`}
    />
  );
}
