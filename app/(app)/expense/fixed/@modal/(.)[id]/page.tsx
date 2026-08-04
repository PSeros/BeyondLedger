import {notFound} from "next/navigation";
import {LuRepeat} from "react-icons/lu";
import DetailModal from "@/components/DetailModal";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import ContractDetail from "@/features/expense/fixed/components/ContractDetail";
import ContractEditForm from "@/features/expense/fixed/components/ContractEditForm";
import EditLink from "@/components/EditLink";
import {getContractById} from "@/features/expense/fixed/db/contractDetail";
import {getContractFormOptions} from "@/features/expense/fixed/db/contractFormOptions";
import {deleteContract} from "@/features/expense/fixed/db/contractMutations";

type InterceptedContractPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

// Intercepted route: soft-navigating to /expense/fixed/[id] from within the list renders this
// as an overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedContractPage({params, searchParams}: InterceptedContractPageProps) {
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
    <DetailModal
      icon={<LuRepeat className="size-5"/>}
      title={contract.name}
      subtitle={
        <>
          <span className="truncate">{contract.supplier}</span>
          <CategoryChip label={contract.category}/>
        </>
      }
      footer={
        editing ? undefined : (
          <div className="flex items-center justify-between gap-2">
            <DeleteEntityButton id={contract.id} action={deleteContract} label={contract.name}/>
            <div className="flex items-center gap-2">
              <EditLink id={contract.id} basePath="/expense/fixed"/>
            </div>
          </div>
        )
      }
    >
      {editing && options ? (
        <ContractEditForm contract={contract} options={options}/>
      ) : (
        <ContractDetail contract={contract}/>
      )}
    </DetailModal>
  );
}
