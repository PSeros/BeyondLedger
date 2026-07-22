import type {ReactNode} from "react";
import {Card} from "@heroui/react";

type TopKTableCardRow = {
  id: number | string;
  label: string;
  amount: number;
  count?: number;
};

type TopKTableCardProps = {
  title?: string;
  rows?: TopKTableCardRow[];
  /** Optional control rendered at the right of the header (e.g. a view toggle). */
  headerAction?: ReactNode;
};

export default function TopKTableCard({title, rows = [], headerAction}: TopKTableCardProps = {}) {
  if (!title) {
    return <Card className="h-full"/>;
  }

  const maxAmount = Math.max(1, ...rows.map((row) => row.amount));

  return (
    <Card className="h-full">
      <Card.Header className="flex flex-row items-center justify-between gap-4">
        <p className="text-sm">{title}</p>
        {headerAction}
      </Card.Header>

      <Card.Content className="flex flex-col justify-center gap-3 pt-2">
        {rows.length === 0 ? (
          <p className="text-center text-sm text-muted">No data</p>
        ) : (
          rows.map((row, index) => (
            <div key={row.id} className="flex items-center gap-3">
              <span className="w-4 text-xs text-muted">{index + 1}</span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{row.label}</span>
                  <span className="shrink-0 text-sm font-medium">
                    {row.amount.toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-default">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{width: `${(row.amount / maxAmount) * 100}%`}}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}
