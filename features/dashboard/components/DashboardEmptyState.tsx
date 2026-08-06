import Link from "next/link";
import {getTranslations} from "next-intl/server";
import {Card} from "@heroui/react";
import {LuLayoutDashboard} from "react-icons/lu";

// Shown when the whole app is empty (no bills, contracts, income or budgets) — a fresh database
// reads as intentional with a CTA to start adding data, instead of blank cards. Mirrors
// ExpenseEmptyState's shape.
export default async function DashboardEmptyState() {
  const t = await getTranslations("dashboard");

  return (
    <Card className="flex flex-1 items-center justify-center">
      <Card.Content className="flex max-w-sm flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
          <LuLayoutDashboard className="size-7"/>
        </span>
        <div>
          <h2 className="text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("emptyText")}</p>
        </div>
        <Link
          href="/expense/variable"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("emptyCta")}
        </Link>
      </Card.Content>
    </Card>
  );
}
