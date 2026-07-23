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
  /**
   * When provided, each row becomes a clickable button that calls this with the row's id —
   * used to toggle a filter (e.g. "show only this supplier"). Omit for a static, read-only card.
   */
  onRowSelect?: (id: TopKTableCardRow["id"]) => void;
  /** Id of the currently-active row (highlighted + toggles off when re-clicked). */
  activeId?: TopKTableCardRow["id"] | null;
};

export default function TopKTableCard({
  title,
  rows = [],
  headerAction,
  onRowSelect,
  activeId,
}: TopKTableCardProps = {}) {
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
          rows.map((row, index) => {
            const isActive = activeId != null && row.id === activeId;

            const body = (
              <>
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
              </>
            );

            if (onRowSelect) {
              return (
                <button
                  key={row.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onRowSelect(row.id)}
                  // -mx-2 lets the hover/active fill reach toward the card's padded edge; no
                  // scroll container here, so nothing clips the rounded corners.
                  className={`hover:bg-default -mx-2 flex items-center gap-3 rounded-[var(--radius)] px-2 py-1 text-left transition-colors ${
                    isActive ? "bg-default" : ""
                  }`}
                >
                  {body}
                </button>
              );
            }

            return (
              <div key={row.id} className="flex items-center gap-3">
                {body}
              </div>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}
