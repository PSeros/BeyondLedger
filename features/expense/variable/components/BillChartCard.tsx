import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";

type BillChartCardProps = BillFilters;

export default async function BillChartCard(filters: BillChartCardProps) {
  const data = await getVariableExpenseChartData(filters);

  return <ChartCard title="Expense" data={data} polarity="lowerIsBetter"/>;
}
