import ChartCard from "@/components/ChartCard";
import {getFixedExpenseChartData} from "@/features/expense/fixed/db/contractChartData";

type ContractChartCardProps = {
  q?: string;
};

export default async function ContractChartCard({q}: ContractChartCardProps) {
  const data = await getFixedExpenseChartData({q});

  return <ChartCard title="Fixed Expense" data={data} polarity="lowerIsBetter"/>;
}
