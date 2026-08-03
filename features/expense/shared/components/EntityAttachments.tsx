"use client";

import {useRef, useState, useTransition} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {useRouter} from "next/navigation";
import {LuDownload, LuFileText, LuImage, LuPaperclip, LuTrash2, LuUpload} from "react-icons/lu";
import type {FileAttachment} from "@/features/expense/shared/db/fileTypes";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({mimeType}: {mimeType: string}) {
  const isImage = mimeType.startsWith("image/");
  const Icon = isImage ? LuImage : LuFileText;
  return <Icon className="size-4 shrink-0 text-muted"/>;
}

type EntityAttachmentsProps = {
  files: FileAttachment[];
  // Bound server action that stores the uploaded file against this Bill/Contract.
  uploadAction: (formData: FormData) => Promise<void>;
  // Deletes a single attachment by id.
  deleteAction: (id: number) => Promise<void>;
};

// Read/upload/download/delete list of document attachments, rendered inside the Bill and Contract
// detail bodies (both the standalone page and the intercepted modal). Bytes are served by
// /api/files/[id]; this only shows metadata and drives the mutations. Delete uses the same
// two-step inline confirm as DeleteEntityButton (a nested Popover inside the modal would be a
// fragile overlay-in-overlay).
export default function EntityAttachments({files, uploadAction, deleteAction}: EntityAttachmentsProps) {
  const router = useRouter();
  const t = useTranslations("attachments");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        await uploadAction(formData);
        router.refresh();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : tErrors("uploadFailed"));
      }
    });
  }

  function onDelete(id: number) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAction(id);
        setConfirmingId(null);
        router.refresh();
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : tErrors("couldNotDelete"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted uppercase">
          <LuPaperclip className="size-3.5"/>
          {t("title")}{files.length > 0 ? ` (${files.length})` : ""}
        </p>
        <input ref={inputRef} type="file" className="hidden" onChange={onPick}/>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          isDisabled={isPending}
          onPress={() => inputRef.current?.click()}
        >
          <LuUpload className="size-4"/>
          {isPending ? t("uploading") : t("attachFile")}
        </Button>
      </div>

      {error ? <p className="text-danger text-xs">{error}</p> : null}

      {files.length === 0 ? (
        <p className="text-sm text-muted">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="border-default bg-surface-secondary flex items-center gap-3 rounded-[var(--radius)] border px-3.5 py-2.5"
            >
              <FileIcon mimeType={file.mimeType}/>
              <a
                href={`/api/files/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium hover:underline">{file.originalName}</p>
                <p className="mt-0.5 text-xs text-muted tabular-nums">{formatSize(file.sizeBytes)}</p>
              </a>

              {confirmingId === file.id ? (
                <span className="flex items-center gap-2">
                  <Button type="button" variant="danger" size="sm" isDisabled={isPending} onPress={() => onDelete(file.id)}>
                    {isPending ? tCommon("deleting") : tCommon("yesDelete")}
                  </Button>
                  <Button type="button" variant="tertiary" size="sm" isDisabled={isPending} onPress={() => setConfirmingId(null)}>
                    {tCommon("cancel")}
                  </Button>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    isIconOnly
                    aria-label={t("download", {name: file.originalName})}
                    onPress={() => window.open(`/api/files/${file.id}?download=1`, "_blank")}
                  >
                    <LuDownload className="size-4"/>
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="sm"
                    isIconOnly
                    aria-label={t("deleteFile", {name: file.originalName})}
                    onPress={() => setConfirmingId(file.id)}
                  >
                    <LuTrash2 className="size-4"/>
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
