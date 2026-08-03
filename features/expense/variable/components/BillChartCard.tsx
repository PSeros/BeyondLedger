import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";

type BillChartCardProps = Omit<BillFilters, "dateFrom" | "dateTo">;

export default async function BillChartCard(filters: BillChartCardProps) {
  const t = await getTranslations("charts");
  const data = await getVariableExpenseChartData(filters);

  return <ChartCard title={t("expense")} data={data} polarity="lowerIsBetter"/>;
}
