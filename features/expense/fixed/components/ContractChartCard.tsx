import ChartCard from "@/components/ChartCard";
import {getFixedExpenseChartData} from "@/features/expense/fixed/db/contractChartData";
import type {ContractFilters} from "@/features/expense/fixed/db/contractWhere";

type ContractChartCardProps = Omit<ContractFilters, "status">;

export default async function ContractChartCard(filters: ContractChartCardProps) {
  const data = await getFixedExpenseChartData(filters);

  return <ChartCard title="Fixed Expense" data={data} polarity="lowerIsBetter"/>;
}
