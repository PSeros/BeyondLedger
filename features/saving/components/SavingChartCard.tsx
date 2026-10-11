import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {
  getFixedSavingChartData,
  getVariableSavingChartData,
  type SavingChartFilters,
} from "@/features/saving/db/savingChartData";
import {getBaseline} from "@/features/settings/db/appSettings";
import type {ChartMode} from "@/features/expense/shared/db/cumulativeChart";

type SavingChartCardProps = SavingChartFilters & {
  isRecurring: boolean;
  offset?: number;
  mode?: ChartMode;
};

export default async function SavingChartCard({isRecurring, offset = 0, mode = "cumulative", ...filters}: SavingChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([
    isRecurring ? getFixedSavingChartData(filters, offset, mode) : getVariableSavingChartData(filters, offset, mode),
    getBaseline(),
  ]);

  return <ChartCard title={t("saving")} data={data} polarity="higherIsBetter" baselineMetric={baseline.metric} mode={mode}/>;
}
