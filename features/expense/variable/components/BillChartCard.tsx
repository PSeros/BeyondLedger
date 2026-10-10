import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";
import {getBaseline} from "@/features/settings/db/appSettings";
import type {ChartMode} from "@/features/expense/shared/db/cumulativeChart";

type BillChartCardProps = Omit<BillFilters, "dateFrom" | "dateTo"> & {offset?: number; mode?: ChartMode};

export default async function BillChartCard({offset = 0, mode = "cumulative", ...filters}: BillChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([getVariableExpenseChartData(filters, offset, mode), getBaseline()]);

  return <ChartCard title={t("expense")} data={data} polarity="lowerIsBetter" baselineMetric={baseline.metric} mode={mode}/>;
}
