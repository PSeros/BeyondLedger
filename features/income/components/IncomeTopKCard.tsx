import IncomeTopKToggleCard from "@/features/income/components/IncomeTopKToggleCard";
import {getTopCategories, getTopSources} from "@/features/income/db/incomeTopKData";
import type {IncomeFilters} from "@/features/income/db/incomeWhere";

// Variable (one-time) tab only. Status doesn't apply to one-time income; the tab discriminator is
// forced inside the top-k queries.
type IncomeTopKCardProps = Omit<IncomeFilters, "isRecurring" | "status">;

export default async function IncomeTopKCard(filters: IncomeTopKCardProps) {
  const [sourceRows, categoryRows] = await Promise.all([
    getTopSources({...filters, limit: 4}),
    getTopCategories({...filters, limit: 4}),
  ]);

  return <IncomeTopKToggleCard sourceRows={sourceRows} categoryRows={categoryRows}/>;
}
