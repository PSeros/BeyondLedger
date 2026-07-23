import {notFound} from "next/navigation";
import BillDetail from "@/features/expense/variable/components/BillDetail";
import BillDetailModal from "@/features/expense/variable/components/BillDetailModal";
import BillEditForm from "@/features/expense/variable/components/BillEditForm";
import EditLink from "@/features/expense/variable/components/EditLink";
import {getBillById} from "@/features/expense/variable/db/billDetail";
import {getBillFormOptions} from "@/features/expense/variable/db/billFormOptions";

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
    <BillDetailModal
      title={bill.supplier}
      footer={editing ? undefined : <EditLink id={bill.id}/>}
    >
      {editing && options ? (
        <BillEditForm bill={bill} options={options}/>
      ) : (
        <BillDetail bill={bill}/>
      )}
    </BillDetailModal>
  );
}
