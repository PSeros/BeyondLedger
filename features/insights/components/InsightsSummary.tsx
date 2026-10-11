import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import type {InsightsRow} from "@/features/insights/db/insightsRows";
import type {InsightsDomain} from "@/features/insights/params";

// Phase-1 headline: total + entry count per domain, and net when both are shown.
export default async function InsightsSummary({rows, domain}: {rows: InsightsRow[]; domain: InsightsDomain}) {
  const t = await getTranslations("insights");
  const format = await getFormatter();

  const totals = {expense: {sum: 0, count: 0}, income: {sum: 0, count: 0}};
  for (const row of rows) {
    totals[row.domain].sum += row.amount;
    totals[row.domain].count += 1;
  }

  const tiles = [
    ...(domain !== "income" ? [{key: "expense", title: t("domainExpense"), ...totals.expense}] : []),
    ...(domain !== "expense" ? [{key: "income", title: t("domainIncome"), ...totals.income}] : []),
    ...(domain === "both"
      ? [{key: "net", title: t("net"), sum: totals.income.sum - totals.expense.sum, count: null}]
      : []),
  ];

  return (
    // Three across even on a phone (like the dashboard KPIs), with tighter padding and type below sm.
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {tiles.map((tile) => (
        <Card key={tile.key} className="flex flex-col gap-1 p-2 sm:gap-2 sm:p-4">
          <Card.Header>
            <Card.Title className="text-muted">{tile.title}</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col items-start gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
            <span className="w-full truncate text-sm font-bold tabular-nums sm:w-auto sm:text-2xl">{format.number(tile.sum, "currency")}</span>
            {tile.count != null ? (
              <span className="shrink-0 text-xs text-muted tabular-nums sm:text-sm">{t("entryCount", {count: tile.count})}</span>
            ) : null}
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
