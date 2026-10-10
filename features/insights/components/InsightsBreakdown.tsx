"use client";

import {useFormatter, useTranslations} from "next-intl";
import {Button, ButtonGroup, Card} from "@heroui/react";
import {useInsightsParams} from "@/hooks/useInsightsParams";
import {BREAKDOWN_DIMENSIONS, type BreakdownDimension} from "@/features/insights/params";
import type {BreakdownRow} from "@/features/insights/stats";

export type BreakdownPanel = {key: "expense" | "income"; rows: BreakdownRow[]};

const COLORS = {expense: "var(--danger)", income: "var(--success)"};

// Ranked horizontal bars per category / counterparty / tag (?by). One panel per shown domain; bars
// share a scale within a panel only.
export default function InsightsBreakdown({panels}: {panels: BreakdownPanel[]}) {
  const t = useTranslations("insights");
  const format = useFormatter();
  const {query, update} = useInsightsParams();

  const dimensionLabels: Record<BreakdownDimension, string> = {
    category: t("byCategory"),
    counterparty: t("byCounterparty"),
    tag: t("byTag"),
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2">
        <Card.Title>{t("breakdownTitle")}</Card.Title>
        <ButtonGroup size="sm">
          {BREAKDOWN_DIMENSIONS.map((dimension) => (
            <Button
              key={dimension}
              variant={query.by === dimension ? "secondary" : "tertiary"}
              onPress={() => update({by: dimension === "category" ? null : dimension})}
            >
              {dimensionLabels[dimension]}
            </Button>
          ))}
        </ButtonGroup>
      </Card.Header>
      <Card.Content className={`grid grid-cols-1 gap-6 ${panels.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {panels.map((panel) => {
          const max = Math.max(...panel.rows.map((row) => row.amount), 0);
          return (
            <div key={panel.key} className="flex min-w-0 flex-col gap-2">
              {panels.length > 1 ? <p className="text-sm text-muted">{t(panel.key === "expense" ? "domainExpense" : "domainIncome")}</p> : null}
              {panel.rows.length === 0 ? <p className="text-sm text-muted">{t("noBreakdown")}</p> : null}
              {panel.rows.map((row, index) => {
                const name = row.isOther ? t("other") : row.isUntagged ? t("untagged") : row.label;
                const amount = format.number(row.amount, "currency");
                return (
                  <div key={index} className="flex items-center gap-3" title={`${name}: ${amount} · ${t("entryCount", {count: row.count})}`}>
                    <span className={`w-36 shrink-0 truncate text-sm ${row.isOther || row.isUntagged ? "text-muted" : ""}`}>{name}</span>
                    <div className="h-3 min-w-16 flex-1">
                      <div
                        className="h-full rounded-e"
                        style={{
                          width: `${max > 0 ? Math.max(1, (row.amount / max) * 100) : 0}%`,
                          background: row.isOther ? "var(--muted)" : COLORS[panel.key],
                        }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-end text-sm tabular-nums">{amount}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Card.Content>
    </Card>
  );
}
