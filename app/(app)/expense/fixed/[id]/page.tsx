import Link from "next/link";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuArrowLeft} from "react-icons/lu";
import ContractDetail from "@/features/expense/fixed/components/ContractDetail";
import {getContractById} from "@/features/expense/fixed/db/contractDetail";

type ContractPageProps = {
  params: Promise<{id: string}>;
};

// Standalone full page — rendered on a hard load / direct link to /expense/fixed/[id].
// The intercepted @modal/(.)[id] route renders the same ContractDetail as an overlay instead.
export default async function ContractPage({params}: ContractPageProps) {
  const {id} = await params;
  const numericId = Number(id);
  const contract = Number.isInteger(numericId) ? await getContractById(numericId) : null;

  if (!contract) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
      <Link
        href="/expense/fixed"
        className="text-foreground-500 hover:text-foreground inline-flex w-fit items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        Back to fixed expenses
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{contract.name}</h1>
        <p className="text-foreground-500 text-sm">
          {contract.supplier} · {contract.category}
        </p>
      </div>

      <Card>
        <Card.Content className="pt-6">
          <ContractDetail contract={contract}/>
        </Card.Content>
      </Card>
    </div>
  );
}
