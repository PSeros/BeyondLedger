import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedExpenses} from "@/features/expense/fixed/db/contractUpcomingData";
import type {ContractFilters} from "@/features/expense/fixed/db/contractWhere";

type ContractUpcomingCardProps = Omit<ContractFilters, "status">;

export default async function ContractUpcomingCard(filters: ContractUpcomingCardProps) {
  const rows = await getUpcomingFixedExpenses({...filters, withinDays: 30});

  return <UpcomingDueCard title="Upcoming (30 days)" rows={rows} windowDays={30}/>;
}
