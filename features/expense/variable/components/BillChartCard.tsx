import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";
import {getBaseline} from "@/features/settings/db/appSettings";

type BillChartCardProps = Omit<BillFilters, "dateFrom" | "dateTo"> & {offset?: number};

export default async function BillChartCard({offset = 0, ...filters}: BillChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([getVariableExpenseChartData(filters, offset), getBaseline()]);

  return <ChartCard title={t("expense")} data={data} polarity="lowerIsBetter" baselineMetric={baseline.metric}/>;
}
