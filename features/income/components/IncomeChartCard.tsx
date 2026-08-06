import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {
  getFixedIncomeChartData,
  getVariableIncomeChartData,
  type IncomeChartFilters,
} from "@/features/income/db/incomeChartData";

type IncomeChartCardProps = IncomeChartFilters & {
  isRecurring: boolean;
  offset?: number;
};

export default async function IncomeChartCard({isRecurring, offset = 0, ...filters}: IncomeChartCardProps) {
  const t = await getTranslations("charts");
  const data = isRecurring
    ? await getFixedIncomeChartData(filters, offset)
    : await getVariableIncomeChartData(filters, offset);

  return <ChartCard title={t("income")} data={data} polarity="higherIsBetter"/>;
}
