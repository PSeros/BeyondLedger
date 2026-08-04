import {getTranslations} from "next-intl/server";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft, LuReceipt} from "react-icons/lu";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import BillDetail from "@/features/expense/variable/components/BillDetail";
import BillEditForm from "@/features/expense/variable/components/BillEditForm";
import EditLink from "@/components/EditLink";
import {getBillById} from "@/features/expense/variable/db/billDetail";
import {getBillFormOptions} from "@/features/expense/variable/db/billFormOptions";
import {deleteBill} from "@/features/expense/variable/db/billMutations";

type BillPageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// Standalone full page — rendered on a hard load / direct link to /expense/variable/[id].
// The intercepted @modal/(.)[id] route renders the same detail as an overlay instead.
export default async function BillPage({params, searchParams}: BillPageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const bill = Number.isInteger(numericId) ? await getBillById(numericId) : null;

  if (!bill) {
    notFound();
  }

  const options = editing ? await getBillFormOptions() : null;
  const t = await getTranslations("detail");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/expense/variable"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        {t("backToVariableExpenses")}
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <LuReceipt className="size-5"/>
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">{bill.supplier}</h1>
              <CategoryChip label={bill.supplierCategory}/>
            </div>
            {bill.documentNumber ? (
              <p className="text-foreground-500 text-sm">{t("docNumber", {number: bill.documentNumber})}</p>
            ) : null}
          </div>
        </div>
        {editing ? null : (
          <div className="flex items-center gap-2">
            <DeleteEntityButton id={bill.id} action={deleteBill} label={bill.supplier} redirectTo="/expense/variable"/>
            <EditLink id={bill.id} basePath="/expense/variable"/>
          </div>
        )}
      </div>

      <Card>
        <Card.Content className="pt-6">
          {editing && options ? (
            <BillEditForm bill={bill} options={options}/>
          ) : (
            <BillDetail bill={bill}/>
          )}
        </Card.Content>
      </Card>
    </div>
  );
}
