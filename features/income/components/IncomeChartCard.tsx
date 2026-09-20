import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {
  getFixedIncomeChartData,
  getVariableIncomeChartData,
  type IncomeChartFilters,
} from "@/features/income/db/incomeChartData";
import {getBaseline} from "@/features/settings/db/appSettings";

type IncomeChartCardProps = IncomeChartFilters & {
  isRecurring: boolean;
  offset?: number;
};

export default async function IncomeChartCard({isRecurring, offset = 0, ...filters}: IncomeChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([
    isRecurring ? getFixedIncomeChartData(filters, offset) : getVariableIncomeChartData(filters, offset),
    getBaseline(),
  ]);

  return <ChartCard title={t("income")} data={data} polarity="higherIsBetter" baselineMetric={baseline.metric}/>;
}
