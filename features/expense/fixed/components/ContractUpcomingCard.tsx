import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedExpenses} from "@/features/expense/fixed/db/contractUpcomingData";

type ContractUpcomingCardProps = {
  q?: string;
};

export default async function ContractUpcomingCard({q}: ContractUpcomingCardProps) {
  const rows = await getUpcomingFixedExpenses({q, withinDays: 30});

  return <UpcomingDueCard title="Upcoming (30 days)" rows={rows} windowDays={30}/>;
}
