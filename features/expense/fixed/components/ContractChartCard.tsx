import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {getFixedExpenseChartData} from "@/features/expense/fixed/db/contractChartData";
import type {ContractFilters} from "@/features/expense/fixed/db/contractWhere";
import {getBaseline} from "@/features/settings/db/appSettings";

type ContractChartCardProps = Omit<ContractFilters, "status"> & {offset?: number};

export default async function ContractChartCard({offset = 0, ...filters}: ContractChartCardProps) {
  const t = await getTranslations("charts");
  const [data, baseline] = await Promise.all([getFixedExpenseChartData(filters, offset), getBaseline()]);

  return <ChartCard title={t("fixedExpense")} data={data} polarity="lowerIsBetter" baselineMetric={baseline.metric}/>;
}
