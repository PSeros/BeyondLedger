import type {ReactNode} from "react";
import {getFormatter, getTranslations} from "next-intl/server";
import StatusChip from "@/components/StatusChip";
import TagChip from "@/components/TagChip";
import EntityAttachments from "@/features/expense/shared/components/EntityAttachments";
import {deleteFileAsset, uploadContractFile} from "@/features/expense/shared/db/fileMutations";
import type {ContractDetailData} from "@/features/expense/fixed/db/contractDetail";

// A single label/value line. Hairline rows (border-t between) read lighter than a boxed grid.
function Row({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="border-default flex items-center justify-between gap-4 border-t py-2.5 first:border-t-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}

// Shared, read-only view of a Contract — rendered both by the standalone [id] page and the
// intercepted-route modal. Name + supplier/category live in each surface's own header, not here.
export default async function ContractDetail({contract}: {contract: ContractDetailData}) {
  const t = await getTranslations("fields");
  const format = await getFormatter();

  return (
    // text-foreground anchors the default text color: HeroUI's Modal.Body forces text-muted on
    // its content, which would gray out the values (the standalone Card doesn't).
    <div className="flex flex-col gap-5 text-foreground">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(contract.amount, "currency")}</p>
          <p className="mt-1 text-sm text-muted">{contract.frequency}</p>
        </div>
        <StatusChip status={contract.status}/>
      </div>

      <dl className="flex flex-col">
        <Row label={t("startDate")}>{format.dateTime(new Date(contract.startDate), "long")}</Row>
        <Row label={t("endDate")}>{contract.endDate ? format.dateTime(new Date(contract.endDate), "long") : "—"}</Row>
        <Row label={t("noticePeriodShort")}>
          {contract.noticePeriod != null ? t("days", {count: contract.noticePeriod}) : "—"}
        </Row>
        <Row label={t("documentNumber")}>{contract.documentNumber ?? "—"}</Row>
      </dl>

      {contract.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {contract.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color}/>
          ))}
        </div>
      ) : null}

      <EntityAttachments
        files={contract.files}
        uploadAction={uploadContractFile.bind(null, contract.id)}
        deleteAction={deleteFileAsset}
      />
    </div>
  );
}
