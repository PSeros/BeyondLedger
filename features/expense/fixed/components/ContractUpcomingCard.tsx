import {getTranslations} from "next-intl/server";
import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedExpenses} from "@/features/expense/fixed/db/contractUpcomingData";
import type {ContractFilters} from "@/features/expense/fixed/db/contractWhere";

type ContractUpcomingCardProps = Omit<ContractFilters, "status"> & {withinDays?: number};

export default async function ContractUpcomingCard({withinDays = 30, ...filters}: ContractUpcomingCardProps) {
  const t = await getTranslations("upcoming");
  const rows = await getUpcomingFixedExpenses({...filters, withinDays});

  return (
    <UpcomingDueCard
      title={t("titleDays", {days: withinDays})}
      rows={rows}
      windowDays={withinDays}
      basePath="/expense/fixed"
    />
  );
}
