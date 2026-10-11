import {notFound} from "next/navigation";
import {LuRepeat} from "react-icons/lu";
import DetailModal from "@/components/DetailModal";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import SavingDetail from "@/features/saving/components/SavingDetail";
import SavingEditForm from "@/features/saving/components/SavingEditForm";
import EditLink from "@/components/EditLink";
import {getSavingById} from "@/features/saving/db/savingDetail";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import {deleteSaving} from "@/features/saving/db/savingMutations";

type InterceptedFixedSavingPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

// Intercepted route: soft-navigating to /saving/fixed/[id] from within the list renders this as an
// overlay. A hard load / direct link hits the standalone [id]/page.tsx instead.
export default async function InterceptedFixedSavingPage({params, searchParams}: InterceptedFixedSavingPageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const saving = Number.isInteger(numericId) ? await getSavingById(numericId) : null;

  if (!saving) {
    notFound();
  }

  const options = editing ? await getSavingFormOptions() : null;

  return (
    <DetailModal
      icon={<LuRepeat className="size-5"/>}
      title={saving.name}
      subtitle={
        <>
          <CategoryChip label={saving.target}/>
        </>
      }
      footer={
        editing ? undefined : (
          <div className="flex items-center justify-between gap-2">
            <DeleteEntityButton id={saving.id} action={deleteSaving} label={saving.name}/>
            <div className="flex items-center gap-2">
              <EditLink id={saving.id} basePath="/saving/fixed"/>
            </div>
          </div>
        )
      }
    >
      {editing && options ? (
        <SavingEditForm saving={saving} options={options}/>
      ) : (
        <SavingDetail saving={saving}/>
      )}
    </DetailModal>
  );
}
