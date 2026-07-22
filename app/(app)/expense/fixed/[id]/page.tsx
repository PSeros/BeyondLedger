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
  const contract = await getContractById(Number(id));

  if (!contract) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <Link
        href="/expense/fixed"
        className="text-foreground-500 hover:text-foreground mb-4 inline-flex items-center gap-2 text-sm"
      >
        <LuArrowLeft/>
        Back to fixed expenses
      </Link>
      <Card>
        <Card.Header>
          <h1 className="text-lg font-semibold">{contract.name}</h1>
        </Card.Header>
        <Card.Content className="pt-2">
          <ContractDetail contract={contract}/>
        </Card.Content>
      </Card>
    </div>
  );
}
