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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.key} className="flex flex-col gap-2 p-4">
          <Card.Header>
            <Card.Title className="text-muted">{tile.title}</Card.Title>
          </Card.Header>
          <Card.Content className="flex items-end justify-between gap-3">
            <span className="truncate text-2xl font-bold tabular-nums">{format.number(tile.sum, "currency")}</span>
            {tile.count != null ? (
              <span className="shrink-0 text-sm text-muted tabular-nums">{t("entryCount", {count: tile.count})}</span>
            ) : null}
          </Card.Content>
        </Card>
      ))}
    </div>
  );
}
