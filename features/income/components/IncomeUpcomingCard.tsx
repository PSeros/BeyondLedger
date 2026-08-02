import UpcomingDueCard from "@/components/UpcomingDueCard";
import {getUpcomingFixedIncome} from "@/features/income/db/incomeUpcomingData";
import type {IncomeFilters} from "@/features/income/db/incomeWhere";

// Fixed (recurring) tab only. Restricts to Active recurring income by nature, so status/date range
// and the tab discriminator don't apply here.
type IncomeUpcomingCardProps = Omit<IncomeFilters, "status" | "dateFrom" | "dateTo" | "isRecurring">;

export default async function IncomeUpcomingCard(filters: IncomeUpcomingCardProps) {
  const rows = await getUpcomingFixedIncome({...filters, withinDays: 30});

  return <UpcomingDueCard title="Upcoming (30 days)" rows={rows} windowDays={30}/>;
}
