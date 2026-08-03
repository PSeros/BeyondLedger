import {getTranslations} from "next-intl/server";
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
  const t = await getTranslations("charts");
  const data = isRecurring
    ? await getFixedIncomeChartData(filters)
    : await getVariableIncomeChartData(filters);

  return <ChartCard title={t("income")} data={data} polarity="higherIsBetter"/>;
}
