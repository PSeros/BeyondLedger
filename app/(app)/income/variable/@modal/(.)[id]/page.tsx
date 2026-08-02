import {notFound} from "next/navigation";
import {LuBanknote} from "react-icons/lu";
import DetailModal from "@/components/DetailModal";
import CategoryChip from "@/components/CategoryChip";
import ModalCloseButton from "@/components/ModalCloseButton";
import IncomeDetail from "@/features/income/components/IncomeDetail";
import IncomeEditForm from "@/features/income/components/IncomeEditForm";
import EditLink from "@/features/income/components/EditLink";
import {getIncomeById} from "@/features/income/db/incomeDetail";
import {getIncomeFormOptions} from "@/features/income/db/incomeFormOptions";

type InterceptedVariableIncomePageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// Intercepted route: soft-navigating to /income/variable/[id] from within the list renders this as
// an overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedVariableIncomePage({params, searchParams}: InterceptedVariableIncomePageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const income = Number.isInteger(numericId) ? await getIncomeById(numericId) : null;

  if (!income) {
    notFound();
  }

  const options = editing ? await getIncomeFormOptions() : null;

  return (
    <DetailModal
      icon={<LuBanknote className="size-5"/>}
      title={income.name}
      subtitle={
        <>
          <span className="truncate">{income.source}</span>
          <CategoryChip label={income.category}/>
        </>
      }
      footer={
        editing ? undefined : (
          <div className="flex items-center justify-end gap-2">
            <ModalCloseButton/>
            <EditLink id={income.id} basePath="/income/variable"/>
          </div>
        )
      }
    >
      {editing && options ? (
        <IncomeEditForm income={income} options={options}/>
      ) : (
        <IncomeDetail income={income}/>
      )}
    </DetailModal>
  );
}
