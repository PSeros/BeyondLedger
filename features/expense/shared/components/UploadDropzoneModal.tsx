"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Modal} from "@heroui/react";
import {LuFileText, LuImage, LuUpload, LuX} from "react-icons/lu";

// Formats accepted by Mistral OCR — mirrors ACCEPTED_MIME_TYPES in features/ocr/db/ocrActions.ts.
const ACCEPTED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const ACCEPT_ATTR = ".pdf,image/png,image/jpeg,image/webp";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadDropzoneModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Called with the chosen files when the user confirms; the parent runs the OCR pipeline per file.
  onSubmit: (files: File[]) => void;
};

// Drag-and-drop + browse picker for the OCR "Upload" flow (Phase 8d). HeroUI's DropZone is Pro-only,
// so this is a lightweight equivalent styled with the app's tokens: a dashed drop target that also
// opens the native file dialog, an accumulating file list with per-row remove, and Upload/Cancel.
export default function UploadDropzoneModal({isOpen, onOpenChange, onSubmit}: UploadDropzoneModalProps) {
  const t = useTranslations("scan");
  const tCommon = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState(false);

  function reset() {
    setFiles([]);
    setDragging(false);
    setSkipped(false);
  }

  // Filters to supported types and de-dupes (by name+size) against the already-selected files.
  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    const accepted = list.filter((file) => ACCEPTED_MIME.has(file.type));
    setSkipped(accepted.length !== list.length);
    if (accepted.length === 0) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((file) => `${file.name}:${file.size}`));
      const merged = [...prev];
      for (const file of accepted) {
        const key = `${file.name}:${file.size}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
  }

  function onDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) addFiles(event.target.files);
    event.target.value = ""; // allow re-selecting the same file later
  }

  function close(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  function submit() {
    if (files.length === 0) return;
    onSubmit(files);
    reset();
    onOpenChange(false);
  }

  return (
    <Modal.Backdrop isOpen={isOpen} variant="blur" onOpenChange={close}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger/>
          <Modal.Header className="flex-row items-start gap-3">
            <div className="min-w-0 flex-1">
              <Modal.Heading className="block truncate text-base font-semibold">{t("scanDocuments")}</Modal.Heading>
              <p className="mt-0.5 truncate text-sm text-muted">{t("scanSubtitle")}</p>
            </div>
          </Modal.Header>
          {/* Modal.Body forces text-muted; re-assert text-foreground so the dropzone copy reads normally. */}
          <Modal.Body className="-mx-6 px-6 py-1">
            <div className="flex flex-col gap-3 text-foreground">
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius)] border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? "border-accent bg-[color-mix(in_oklab,var(--accent)_10%,transparent)]"
                    : "border-default bg-surface-secondary hover:border-accent"
                }`}
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-accent">
                  <LuUpload className="size-6"/>
                </span>
                <div>
                  <p className="text-sm font-medium">{t("dropHere")}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t("orText")} <span className="text-accent underline">{t("browse")}</span>
                  </p>
                </div>
                <p className="text-xs text-muted">{t("acceptedTypes")}</p>
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR}
                className="hidden"
                onChange={onPick}
              />

              {skipped ? (
                <p className="text-danger text-xs">
                  {t("someSkipped")}
                </p>
              ) : null}

              {files.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}:${file.size}`}
                      className="border-default bg-surface-secondary flex items-center gap-3 rounded-[var(--radius)] border px-3.5 py-2.5"
                    >
                      {file.type.startsWith("image/") ? (
                        <LuImage className="size-4 shrink-0 text-muted"/>
                      ) : (
                        <LuFileText className="size-4 shrink-0 text-muted"/>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        <p className="mt-0.5 text-xs text-muted tabular-nums">{formatSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="sm"
                        isIconOnly
                        aria-label={t("remove", {name: file.name})}
                        onPress={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <LuX className="size-4"/>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="tertiary" onPress={() => close(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" variant="primary" isDisabled={files.length === 0} onPress={submit}>
              {t("uploadButton", {count: files.length})}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
