import {getTranslations} from "next-intl/server";
import ChartCard from "@/components/ChartCard";
import {getVariableExpenseChartData} from "@/features/expense/variable/db/billChartData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";

type BillChartCardProps = Omit<BillFilters, "dateFrom" | "dateTo"> & {offset?: number};

export default async function BillChartCard({offset = 0, ...filters}: BillChartCardProps) {
  const t = await getTranslations("charts");
  const data = await getVariableExpenseChartData(filters, offset);

  return <ChartCard title={t("expense")} data={data} polarity="lowerIsBetter"/>;
}
