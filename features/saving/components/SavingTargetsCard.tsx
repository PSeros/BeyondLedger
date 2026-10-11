import {getFormatter, getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {getSavingTargetBalances, type SavingBalanceFilters} from "@/features/saving/db/savingTargetBalances";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import SavingWithdrawButton from "@/features/saving/components/SavingWithdrawButton";

// Paid in per target (deposits − withdrawals up to today), each with a Withdraw shortcut.
export default async function SavingTargetsCard(filters: SavingBalanceFilters) {
  const [t, tCommon, format, rows, options] = await Promise.all([
    getTranslations("saving"),
    getTranslations("common"),
    getFormatter(),
    getSavingTargetBalances(filters),
    getSavingFormOptions(),
  ]);
  // Bars share one scale; a target overdrawn below zero shows an empty bar.
  const max = Math.max(0, ...rows.map((row) => row.paidIn));

  return (
    <Card className="h-full">
      <Card.Header>
        <p className="text-sm">{t("paidInTitle")}</p>
      </Card.Header>
      <Card.Content className="scrollbar-hide flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-2">
        {rows.length === 0 ? (
          <p className="flex h-full items-center justify-center text-center text-sm text-muted">{tCommon("noData")}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{row.name}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {format.number(row.paidIn, "currencyWhole")}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-default">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{width: `${max > 0 ? (Math.max(0, row.paidIn) / max) * 100 : 0}%`}}
                  />
                </div>
              </div>
              <SavingWithdrawButton options={options} targetId={String(row.id)} targetName={row.name}/>
            </div>
          ))
        )}
      </Card.Content>
    </Card>
  );
}
