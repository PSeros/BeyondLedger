import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import InsightsStatsControls from "@/features/insights/components/InsightsStatsControls";
import type {InsightsRow} from "@/features/insights/db/insightsRows";
import type {InsightsDomain, StatKey, StatUnit} from "@/features/insights/params";
import {computeStats, samplesFor, type StatValues} from "@/features/insights/stats";

type Column = {key: string; title: string; values: StatValues};

// Stats table: one row per picked stat, one column per shown domain (plus net for time units, where
// income and expense share the same buckets).
export default async function InsightsStats({
  rows,
  domain,
  unit,
  stats,
  span,
}: {
  rows: InsightsRow[];
  domain: InsightsDomain;
  unit: StatUnit;
  stats: StatKey[];
  span: {start: Date; end: Date};
}) {
  const t = await getTranslations("insights");
  const format = await getFormatter();

  const expense = rows.filter((row) => row.domain === "expense");
  const income = rows.filter((row) => row.domain === "income");
  const isTimeUnit = unit === "day" || unit === "week" || unit === "month";

  const columns: Column[] = [
    ...(domain !== "income" ? [{key: "expense", title: t("domainExpense"), values: computeStats(samplesFor(expense, unit, span))}] : []),
    ...(domain !== "expense" ? [{key: "income", title: t("domainIncome"), values: computeStats(samplesFor(income, unit, span))}] : []),
  ];
  if (domain === "both" && isTimeUnit) {
    const inc = samplesFor(income, unit, span);
    const exp = samplesFor(expense, unit, span);
    columns.push({key: "net", title: t("net"), values: computeStats(inc.map((value, i) => value - exp[i]))});
  }

  function display(key: StatKey, value: number | null): string {
    if (value == null) return "–";
    if (key === "count") return format.number(value);
    if (key === "variance") return `${format.number(value, {maximumFractionDigits: 2})} €²`;
    return format.number(value, "currency");
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <Card.Title>{t("statsTitle")}</Card.Title>
          <Card.Description>{t(`unitHint.${unit}`)}</Card.Description>
        </div>
        <InsightsStatsControls/>
      </Card.Header>
      <Card.Content className="overflow-x-auto">
        {stats.length === 0 ? (
          <p className="text-sm text-muted">{t("noStatsPicked")}</p>
        ) : (
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-muted">
                <th className="py-1.5 text-start font-medium"/>
                {columns.map((column) => (
                  <th key={column.key} className="py-1.5 text-end font-medium">{column.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((key) => (
                <tr key={key} className="border-t border-[var(--border)]">
                  <th scope="row" className="py-1.5 text-start font-normal text-muted">{t(`stat.${key}`)}</th>
                  {columns.map((column) => (
                    <td key={column.key} className="py-1.5 text-end">{display(key, column.values[key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Content>
    </Card>
  );
}
