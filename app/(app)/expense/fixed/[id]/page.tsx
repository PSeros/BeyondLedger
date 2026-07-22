import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft} from "react-icons/lu";
import ContractDetail from "@/features/expense/fixed/components/ContractDetail";
import ContractEditForm from "@/features/expense/fixed/components/ContractEditForm";
import EditLink from "@/features/expense/fixed/components/EditLink";
import {getContractById} from "@/features/expense/fixed/db/contractDetail";
import {getContractFormOptions} from "@/features/expense/fixed/db/contractFormOptions";

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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/expense/fixed"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        Back to fixed expenses
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{contract.name}</h1>
          <p className="text-foreground-500 text-sm">
            {contract.supplier} · {contract.category}
          </p>
        </div>
        {editing ? null : <EditLink id={contract.id}/>}
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
