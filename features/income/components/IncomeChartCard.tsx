import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {
  getFixedIncomeChartData,
  getVariableIncomeChartData,
  type IncomeChartFilters,
} from "@/features/income/db/incomeChartData";
import {getBaseline} from "@/features/settings/db/appSettings";
import type {ChartMode} from "@/features/expense/shared/db/cumulativeChart";

type IncomeChartCardProps = IncomeChartFilters & {
  isRecurring: boolean;
  offset?: number;
  mode?: ChartMode;
};

export default async function IncomeChartCard({isRecurring, offset = 0, mode = "cumulative", ...filters}: IncomeChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([
    isRecurring ? getFixedIncomeChartData(filters, offset, mode) : getVariableIncomeChartData(filters, offset, mode),
    getBaseline(),
  ]);

  return <ChartCard title={t("income")} data={data} polarity="higherIsBetter" baselineMetric={baseline.metric} mode={mode}/>;
}
