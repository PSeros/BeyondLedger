import type {ReactNode} from "react";
import {getFormatter, getTranslations} from "next-intl/server";
import StatusChip from "@/components/StatusChip";
import TagChip from "@/components/TagChip";
import type {SavingDetailData} from "@/features/saving/db/savingDetail";
import EntityAttachments from "@/features/expense/shared/components/EntityAttachments";
import {deleteFileAsset, uploadSavingFile} from "@/features/expense/shared/db/fileMutations";

// A single label/value line. Hairline rows (border-t between) read lighter than a boxed grid.
function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="border-default flex items-center justify-between gap-4 border-t py-2.5 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}

// Shared, read-only view of a Saving — standalone [id] page and intercepted modal, both tabs.
export default async function SavingDetail({saving}: {saving: SavingDetailData}) {
  const t = await getTranslations("fields");
  const tSaving = await getTranslations("saving");
  const format = await getFormatter();

  return (
    // text-foreground anchors the default color: HeroUI's Modal.Body forces text-muted, which
    // would gray out the values (the standalone Card doesn't).
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(saving.amount, "currency")}</p>
          <p className="mt-1 text-sm text-muted">{saving.isOpening ? tSaving("openingBadge") : saving.frequency}</p>
        </div>
        <StatusChip status={saving.status}/>
      </div>

      <dl className="flex flex-col">
        <Row label={saving.isRecurring ? t("startDate") : t("date")}>{format.dateTime(new Date(saving.startDate), "long")}</Row>
        {saving.isRecurring ? (
          <Row label={t("endDate")}>{saving.endDate ? format.dateTime(new Date(saving.endDate), "long") : "—"}</Row>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-1.5">
        <TagChip name={saving.workspace.name} color={saving.workspace.color}/>
        {saving.tags.map((tag) => (
          <TagChip key={tag.id} name={tag.name} color={tag.color}/>
        ))}
      </div>

      <EntityAttachments
        files={saving.files}
        uploadAction={uploadSavingFile.bind(null, saving.id)}
        deleteAction={deleteFileAsset}
      />
    </div>
  );
}
