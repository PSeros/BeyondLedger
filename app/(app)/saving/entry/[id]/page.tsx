import {getTranslations} from "next-intl/server";
import {notFound} from "next/navigation";
import {Card} from "@heroui/react";
import {LuBanknote, LuRepeat} from "react-icons/lu";
import BackLink from "@/components/BackLink";
import CategoryChip from "@/components/CategoryChip";
import DeleteEntityButton from "@/components/DeleteEntityButton";
import SavingDetail from "@/features/saving/components/SavingDetail";
import SavingEditForm from "@/features/saving/components/SavingEditForm";
import EditLink from "@/components/EditLink";
import {getSavingById} from "@/features/saving/db/savingDetail";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";
import {deleteSaving} from "@/features/saving/db/savingMutations";

type SavingEntryPageProps = {
  params: Promise<{id: string}>;
  searchParams: Promise<{edit?: string}>;
};

// One booking (a plan, a deposit or a withdrawal): detail, edit, delete. Reached from a movement row.
export default async function SavingEntryPage({params, searchParams}: SavingEntryPageProps) {
  const {id} = await params;
  const {edit} = await searchParams;
  const editing = edit != null;

  const numericId = Number(id);
  const saving = Number.isInteger(numericId) ? await getSavingById(numericId) : null;

  if (!saving) {
    notFound();
  }

  const options = editing ? await getSavingFormOptions() : null;
  const t = await getTranslations("detail");

  return (
    <div className="h-full min-h-0 overflow-y-auto [scrollbar-gutter:stable]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 py-6">
        <BackLink fallbackHref={`/saving/${saving.targetId}`} fallbackLabel={t("backToPot", {pot: saving.target})}/>

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 sm:size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--accent)]">
              {saving.isRecurring ? <LuRepeat className="size-5"/> : <LuBanknote className="size-5"/>}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{saving.name}</h1>
              <div className="text-foreground-500 mt-0.5 flex min-w-0 items-center gap-1.5 text-sm">
                <CategoryChip label={saving.target}/>
              </div>
            </div>
          </div>
          {editing ? null : (
            <div className="flex items-center gap-2">
              <DeleteEntityButton id={saving.id} action={deleteSaving} label={saving.name} redirectTo={`/saving/${saving.targetId}`}/>
              <EditLink id={saving.id} basePath="/saving/entry"/>
            </div>
          )}
        </div>

        <Card>
          <Card.Content className="pt-6">
            {editing && options ? (
              <SavingEditForm saving={saving} options={options}/>
            ) : (
              <SavingDetail saving={saving}/>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
