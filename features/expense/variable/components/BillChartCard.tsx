import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";

type BillChartCardProps = {
  q?: string;
};

export default async function BillChartCard({q}: BillChartCardProps) {
  const data = await getVariableExpenseChartData({q});

  return <ChartCard title="Expense" data={data} polarity="lowerIsBetter"/>;
}
