import {notFound} from "next/navigation";
import {LuRepeat} from "react-icons/lu";
import DetailModal from "@/components/DetailModal";
import CategoryChip from "@/components/CategoryChip";
import ModalCloseButton from "@/components/ModalCloseButton";
import IncomeDetail from "@/features/income/components/IncomeDetail";
import {getIncomeById} from "@/features/income/db/incomeDetail";

type InterceptedFixedIncomePageProps = {
  params: Promise<{id: string}>;
};

// Intercepted route: soft-navigating to /income/fixed/[id] from within the list renders this as an
// overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedFixedIncomePage({params}: InterceptedFixedIncomePageProps) {
  const {id} = await params;
  const numericId = Number(id);
  const income = Number.isInteger(numericId) ? await getIncomeById(numericId) : null;

  if (!income) {
    notFound();
  }

  return (
    <DetailModal
      icon={<LuRepeat className="size-5"/>}
      title={income.name}
      subtitle={
        <>
          <span className="truncate">{income.source}</span>
          <CategoryChip label={income.category}/>
        </>
      }
      footer={
        <div className="flex items-center justify-end gap-2">
          <ModalCloseButton/>
        </div>
      }
    >
      <IncomeDetail income={income}/>
    </DetailModal>
  );
}
