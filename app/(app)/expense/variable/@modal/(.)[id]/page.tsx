import {notFound} from "next/navigation";
import {LuReceipt} from "react-icons/lu";
import DetailModal from "@/components/DetailModal";
import CategoryChip from "@/components/CategoryChip";
import ModalCloseButton from "@/components/ModalCloseButton";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import BillDetail from "@/features/expense/variable/components/BillDetail";
import BillEditForm from "@/features/expense/variable/components/BillEditForm";
import EditLink from "@/features/expense/variable/components/EditLink";
import {getBillById} from "@/features/expense/variable/db/billDetail";
import {getBillFormOptions} from "@/features/expense/variable/db/billFormOptions";
import {deleteBill} from "@/features/expense/variable/db/billMutations";

type InterceptedBillPageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// Intercepted route: soft-navigating to /expense/variable/[id] from within the list renders
// this as an overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedBillPage({params, searchParams}: InterceptedBillPageProps) {
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
    <DetailModal
      icon={<LuReceipt className="size-5"/>}
      title={bill.supplier}
      titleTrailing={<CategoryChip label={bill.supplierCategory}/>}
      subtitle={bill.documentNumber ? `Doc. ${bill.documentNumber}` : undefined}
      footer={
        editing ? undefined : (
          <div className="flex items-center justify-between gap-2">
            <DeleteEntityButton id={bill.id} action={deleteBill} label={bill.supplier}/>
            <div className="flex items-center gap-2">
              <ModalCloseButton/>
              <EditLink id={bill.id}/>
            </div>
          </div>
        )
      }
    >
      {editing && options ? (
        <BillEditForm bill={bill} options={options}/>
      ) : (
        <BillDetail bill={bill}/>
      )}
    </DetailModal>
  );
}
