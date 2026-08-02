import ChartCard from "@/components/ChartCard";
import {
  getFixedIncomeChartData,
  getVariableIncomeChartData,
  type IncomeChartFilters,
} from "@/features/income/db/incomeChartData";

type IncomeChartCardProps = IncomeChartFilters & {
  isRecurring: boolean;
};

export default async function IncomeChartCard({isRecurring, ...filters}: IncomeChartCardProps) {
  const data = isRecurring
    ? await getFixedIncomeChartData(filters)
    : await getVariableIncomeChartData(filters);

  return <ChartCard title="Income" data={data} polarity="higherIsBetter"/>;
}
