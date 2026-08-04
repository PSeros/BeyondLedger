import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft, LuRepeat} from "react-icons/lu";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import IncomeDetail from "@/features/income/components/IncomeDetail";
import IncomeEditForm from "@/features/income/components/IncomeEditForm";
import EditLink from "@/components/EditLink";
import {getIncomeById} from "@/features/income/db/incomeDetail";
import {getIncomeFormOptions} from "@/features/income/db/incomeFormOptions";
import {deleteIncome} from "@/features/income/db/incomeMutations";

type FixedIncomePageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// Standalone full page — rendered on a hard load / direct link to /income/fixed/[id]. The
// intercepted @modal/(.)[id] route renders the same detail as an overlay instead.
export default async function FixedIncomeDetailPage({params, searchParams}: FixedIncomePageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const income = Number.isInteger(numericId) ? await getIncomeById(numericId) : null;

  if (!income) {
    notFound();
  }

  const options = editing ? await getIncomeFormOptions() : null;
  const t = await getTranslations("detail");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/income/fixed"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        {t("backToFixedIncome")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <LuRepeat className="size-5"/>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{income.name}</h1>
            <div className="text-foreground-500 mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate">{income.source}</span>
              <CategoryChip label={income.category}/>
            </div>
          </div>
        </div>
        {editing ? null : (
          <div className="flex items-center gap-2">
            <DeleteEntityButton id={income.id} action={deleteIncome} label={income.name} redirectTo="/income/fixed"/>
            <EditLink id={income.id} basePath="/income/fixed"/>
          </div>
        )}
      </div>

      <Card>
        <Card.Content className="pt-6">
          {editing && options ? (
            <IncomeEditForm income={income} options={options}/>
          ) : (
            <IncomeDetail income={income}/>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
