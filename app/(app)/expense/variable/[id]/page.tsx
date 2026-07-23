import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft} from "react-icons/lu";
import BillDetail from "@/features/expense/variable/components/BillDetail";
import BillEditForm from "@/features/expense/variable/components/BillEditForm";
import EditLink from "@/features/expense/variable/components/EditLink";
import {getBillById} from "@/features/expense/variable/db/billDetail";
import {getBillFormOptions} from "@/features/expense/variable/db/billFormOptions";

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/expense/variable"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        Back to variable expenses
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{bill.supplier}</h1>
          <p className="text-foreground-500 text-sm">{bill.supplierCategory}</p>
        </div>
        {editing ? null : <EditLink id={bill.id}/>}
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
