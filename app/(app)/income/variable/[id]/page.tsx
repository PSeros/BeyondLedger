import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft, LuBanknote} from "react-icons/lu";
import CategoryChip from "@/components/CategoryChip";
import IncomeDetail from "@/features/income/components/IncomeDetail";
import {getIncomeById} from "@/features/income/db/incomeDetail";

type VariableIncomePageProps = {
  params: Promise<{id: string}>;
};

// Standalone full page — rendered on a hard load / direct link to /income/variable/[id]. The
// intercepted @modal/(.)[id] route renders the same detail as an overlay instead.
export default async function VariableIncomeDetailPage({params}: VariableIncomePageProps) {
  const {id} = await params;
  const numericId = Number(id);
  const income = Number.isInteger(numericId) ? await getIncomeById(numericId) : null;

  if (!income) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/income/variable"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        Back to variable income
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <LuBanknote className="size-5"/>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{income.name}</h1>
            <div className="text-foreground-500 mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate">{income.source}</span>
              <CategoryChip label={income.category}/>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <Card.Content className="pt-6">
          <IncomeDetail income={income}/>
        </Card.Content>
      </Card>
    </div>
  );
}
