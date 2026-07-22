import {notFound} from "next/navigation";
import ContractDetail from "@/features/expense/fixed/components/ContractDetail";
import ContractDetailModal from "@/features/expense/fixed/components/ContractDetailModal";
import {getContractById} from "@/features/expense/fixed/db/contractDetail";

type InterceptedContractPageProps = {
  params: Promise<{id: string}>;
};

// Intercepted route: soft-navigating to /expense/fixed/[id] from within the list renders this
// as an overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedContractPage({params}: InterceptedContractPageProps) {
  const {id} = await params;
  const contract = await getContractById(Number(id));

  if (!contract) {
    notFound();
  }

  return (
    <ContractDetailModal title={contract.name}>
      <ContractDetail contract={contract}/>
    </ContractDetailModal>
  );
}
