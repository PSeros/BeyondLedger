import Link from "next/link";
import {getFormatter, getTranslations} from "next-intl/server";
import {Card, Chip} from "@heroui/react";

type UpcomingDueRow = {
  id: number | string;
  label: string;
  amount: number;
  dueDate: string; // ISO
  frequency?: string;
};

type UpcomingDueCardProps = {
  title?: string;
  rows?: UpcomingDueRow[];
  /** Size of the due-date horizon `rows` was fetched for — used to scale the urgency bar. */
  windowDays?: number;
  /**
   * When provided, each row becomes a Link to `${basePath}/${row.id}` — a soft nav that triggers
   * the detail route (and its intercepted modal). Omit to render plain, non-clickable rows. A plain
   * string (not a function) so this client component can receive it from its Server Component parents.
   */
  basePath?: string;
};

function formatDueIn(dueDate: Date, today: Date, t: (key: string, values?: Record<string, number>) => string): string {
  const days = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (days <= 0) return t("dueToday");
  if (days === 1) return t("dueTomorrow");

  return t("dueInDays", {days});
}

export default async function UpcomingDueCard({title, rows = [], windowDays = 30, basePath}: UpcomingDueCardProps = {}) {
  const format = await getFormatter();
  const t = await getTranslations("upcoming");
  const tCommon = await getTranslations("common");

  if (!title) {
    return <Card className="max-h-[268px]"/>;
  }

  const today = new Date();

  return (
    // `max-h-[268px]` matches ChartCard's measured rendered height (header + h-40 chart). An
    // absolute cap, not `h-full` — percentage heights don't work here since the row above it
    // has no definite height of its own to resolve against, so the card would just grow to
    // fit however many rows are due.
    <Card className="max-h-[268px]">
      <Card.Header>
        <p className="text-sm">{title}</p>
      </Card.Header>

      {/*
        -mx-2 widens this scroll container so a hovered row's -mx-equivalent reach lives INSIDE
        the clip box: overflow-y-auto forces overflow-x to clip, so a row bleeding past this box
        would get its rounded corners sliced square. Rows carry px-2 to keep text aligned with
        the header while their rounded hover fills to this widened edge.
      */}
      <Card.Content className="scrollbar-hide -mx-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-2">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted">{tCommon("noData")}</p>
        ) : (
          rows.map((row) => {
            const dueDate = new Date(row.dueDate);
            const daysUntil = (dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000);
            const urgency = Math.min(1, Math.max(0, 1 - daysUntil / windowDays));

            const body = (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{row.label}</span>
                  <span className="shrink-0 text-sm font-medium">
                    {format.number(row.amount, "currencyWhole")}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted">
                    {formatDueIn(dueDate, today, t)} · {format.dateTime(dueDate, "short")}
                  </p>
                  {row.frequency && (
                    <Chip size="sm" variant="soft" color="accent" className="shrink-0">
                      <Chip.Label>{row.frequency}</Chip.Label>
                    </Chip>
                  )}
                </div>

                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-default">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{width: `${Math.max(6, urgency * 100)}%`}}
                  />
                </div>
              </div>
            );

            if (basePath) {
              return (
                <Link
                  key={row.id}
                  href={`${basePath}/${row.id}`}
                  className="hover:bg-default flex items-center gap-3 rounded-[var(--radius)] px-2 py-1 transition-colors"
                >
                  {body}
                </Link>
              );
            }

            return (
              // px-2 keeps text aligned with the header despite the container's -mx-2.
              <div key={row.id} className="flex items-center gap-3 px-2">
                {body}
              </div>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}
