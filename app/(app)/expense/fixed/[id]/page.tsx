import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft, LuRepeat} from "react-icons/lu";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import ContractDetail from "@/features/expense/fixed/components/ContractDetail";
import ContractEditForm from "@/features/expense/fixed/components/ContractEditForm";
import EditLink from "@/components/EditLink";
import {getContractById} from "@/features/expense/fixed/db/contractDetail";
import {getContractFormOptions} from "@/features/expense/fixed/db/contractFormOptions";
import {deleteContract} from "@/features/expense/fixed/db/contractMutations";

type ContractPageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// Standalone full page — rendered on a hard load / direct link to /expense/fixed/[id].
// The intercepted @modal/(.)[id] route renders the same detail as an overlay instead.
export default async function ContractPage({params, searchParams}: ContractPageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const contract = Number.isInteger(numericId) ? await getContractById(numericId) : null;

  if (!contract) {
    notFound();
  }

  const options = editing ? await getContractFormOptions() : null;
  const t = await getTranslations("detail");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/expense/fixed"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        {t("backToFixedExpenses")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <LuRepeat className="size-5"/>
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{contract.name}</h1>
            <div className="text-foreground-500 mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate">{contract.supplier}</span>
              <CategoryChip label={contract.category}/>
            </div>
          </div>
        </div>
        {editing ? null : (
          <div className="flex items-center gap-2">
            <DeleteEntityButton id={contract.id} action={deleteContract} label={contract.name} redirectTo="/expense/fixed"/>
            <EditLink id={contract.id} basePath="/expense/fixed"/>
          </div>
        )}
      </div>

      <Card>
        <Card.Content className="pt-6">
          {editing && options ? (
            <ContractEditForm contract={contract} options={options}/>
          ) : (
            <ContractDetail contract={contract}/>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
