"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import Link from "next/link";
import {Button, Modal, Spinner} from "@heroui/react";
import {LuChevronRight, LuList} from "react-icons/lu";
import {getBudgetContributions, type BudgetContributions} from "@/features/budget/db/budgetContributions";
import type {BudgetResolved} from "@/features/budget/db/budgets";

// "View entries" button + modal listing the bills and contracts contributing to a budget this
// period. Each row links to the entry's standalone detail page (a full navigation — route
// interception is scoped to the expense segment, so it can't overlay a modal from /budget).
// Contributions are fetched lazily when the modal first opens.
export default function BudgetDetailModal({budget}: {budget: BudgetResolved}) {
  const t = useTranslations("budget");
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<BudgetContributions | null>(null);
  const [loading, setLoading] = useState(false);

  async function openModal() {
    setOpen(true);
    if (!data && !loading) {
      setLoading(true);
      try {
        setData(await getBudgetContributions(budget.id));
      } finally {
        setLoading(false);
      }
    }
  }

  const isEmpty = data !== null && data.bills.length === 0 && data.contracts.length === 0;

  return (
    <>
      <Button type="button" variant="tertiary" size="sm" isIconOnly aria-label={t("viewEntries")} onPress={openModal}>
        <LuList className="size-4"/>
      </Button>

      <Modal.Backdrop isOpen={open} variant="blur" onOpenChange={setOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger/>
            <Modal.Header className="flex-row items-start gap-3">
              <div className="min-w-0 flex-1">
                <Modal.Heading className="block truncate text-base font-semibold">{budget.name}</Modal.Heading>
                <p className="mt-0.5 text-sm text-muted">{t("entriesSubtitle")}</p>
              </div>
            </Modal.Header>
            <Modal.Body className="-mx-6 px-6 py-1">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner/>
                  <span className="ml-2 text-sm text-muted">{t("loadingEntries")}</span>
                </div>
              ) : isEmpty ? (
                <p className="py-10 text-center text-sm text-muted">{t("noEntries")}</p>
              ) : data ? (
                <div className="flex flex-col gap-5 py-1">
                  {data.bills.length > 0 ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-foreground-500 text-xs font-medium uppercase tracking-wide">{t("billsHeading")}</h3>
                      <ul className="flex flex-col gap-1.5">
                        {data.bills.map((bill) => (
                          <li key={bill.id}>
                            <Link
                              href={`/expense/variable/${bill.id}`}
                              className="flex items-center justify-between gap-3 rounded-(--radius) border border-default-200 px-3 py-2 hover:bg-surface-secondary"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{bill.supplierName}</span>
                                <span className="text-xs text-muted">{format.dateTime(new Date(bill.date), {day: "numeric", month: "short", year: "numeric"})}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                <span className="text-sm font-semibold tabular-nums">{format.number(bill.total, "currency")}</span>
                                <LuChevronRight className="size-4 text-muted"/>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {data.contracts.length > 0 ? (
                    <section className="flex flex-col gap-2">
                      <h3 className="text-foreground-500 text-xs font-medium uppercase tracking-wide">{t("contractsHeading")}</h3>
                      <ul className="flex flex-col gap-1.5">
                        {data.contracts.map((contract) => (
                          <li key={contract.id}>
                            <Link
                              href={`/expense/fixed/${contract.id}`}
                              className="flex items-center justify-between gap-3 rounded-(--radius) border border-default-200 px-3 py-2 hover:bg-surface-secondary"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{contract.name}</span>
                                <span className="text-xs text-muted">{contract.supplierName}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                <span className="text-sm font-semibold tabular-nums">{format.number(contract.amount, "currency")}</span>
                                <LuChevronRight className="size-4 text-muted"/>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                </div>
              ) : null}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
