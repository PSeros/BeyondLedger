"use server";

import {readFile} from "node:fs/promises";
import {getTranslations} from "next-intl/server";
import {FileStatusChoice} from "@/prisma/generated/client";
import {client} from "@/lib/prisma";
import {resolveFilePath, saveUploadedFile} from "@/lib/fileStorage";
import {getAiSettings} from "@/features/settings/db/aiSettings";
import {extract} from "@/features/ocr/extract";
import {resolveDraft} from "@/features/ocr/resolve";
import {createBillFromResolvedDraft} from "@/features/expense/variable/db/billMutations";

// Phase 8d — wire an uploaded document through the OCR pipeline into a draft Bill. The client fires
// uploadForOcr (fast: just persist the file), then processOcrUpload (slow: OCR → extract → resolve →
// create Bill) so it can show a processing toast in between. FileAsset.status carries the lifecycle
// (UPLOADED → PROCESSING → COMPLETED | FAILED); no job queue — the client awaits the actions directly.

// Formats accepted by Mistral OCR (see runOcr in features/ocr/mistralOcr.ts).
const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Pulls the uploaded File out of a FormData "file" field, rejecting empty/absent uploads.
async function readUpload(formData: FormData): Promise<File> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    const t = await getTranslations("errors");
    throw new Error(t("noFileUploaded"));
  }
  return file;
}

// Persists the uploaded document as an orphan FileAsset (no billId yet) in the UPLOADED state and
// returns its id. Kept fast so the client can immediately open a processing toast; the actual OCR
// happens in processOcrUpload.
export async function uploadForOcr(formData: FormData): Promise<{fileId: number}> {
  const file = await readUpload(formData);
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    const t = await getTranslations("errors");
    throw new Error(t("unsupportedFileType"));
  }

  const meta = await saveUploadedFile(file);
  const created = await client.fileAsset.create({
    data: {
      originalName: file.name,
      storedName: meta.storedName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      relativePath: meta.relativePath,
      status: FileStatusChoice.UPLOADED,
    },
    select: {id: true},
  });

  return {fileId: created.id};
}

export type ProcessedUpload = {
  billId: number;
  supplierName: string;
  totalAmount: number;
};

// The account + tags the user chose in the upload dialog (the AI can't infer them). Applied to the
// auto-created Bill; a missing account falls back to the active one in createBillFromResolvedDraft.
export type OcrUploadOptions = {workspaceId?: number; tagIds?: number[]};

// Runs the extraction pipeline for an already-uploaded FileAsset and auto-creates the Bill. Flips the
// file to PROCESSING, then COMPLETED (linked to the new Bill) on success or FAILED on any error. The
// thrown message is surfaced to the user in the failure toast / error modal, so keep it concise.
export async function processOcrUpload(fileId: number, options?: OcrUploadOptions): Promise<ProcessedUpload> {
  const file = await client.fileAsset.findUnique({
    where: {id: fileId},
    select: {relativePath: true, mimeType: true},
  });
  if (!file) {
    const t = await getTranslations("errors");
    throw new Error(t("fileNotFound"));
  }

  await client.fileAsset.update({
    where: {id: fileId},
    data: {status: FileStatusChoice.PROCESSING},
  });

  try {
    const settings = await getAiSettings();
    if (!settings.enabled || settings.apiKey.trim() === "") {
      const t = await getTranslations("errors");
      throw new Error(t("aiNotConfigured"));
    }

    const bytes = new Uint8Array(await readFile(resolveFilePath(file.relativePath)));
    const draft = await extract({bytes, mimeType: file.mimeType}, settings);
    const resolved = await resolveDraft(draft);
    const {billId} = await createBillFromResolvedDraft(resolved, fileId, options);

    return {
      billId,
      supplierName: draft.supplierName.trim() || (await getTranslations("errors"))("unknownSupplier"),
      totalAmount: resolved.totalAmount,
    };
  } catch (error) {
    // Best-effort: mark the file FAILED so its state reflects the outcome, then rethrow to the client.
    await client.fileAsset
      .update({where: {id: fileId}, data: {status: FileStatusChoice.FAILED}})
      .catch(() => undefined);
    throw error instanceof Error ? error : new Error((await getTranslations("errors"))("ocrFailed"));
  }
}

// Re-runs the pipeline for a file that previously failed (its FileAsset already exists). Used by the
// error modal's Retry action, which carries the account + tags chosen at upload.
export async function retryOcrUpload(fileId: number, options?: OcrUploadOptions): Promise<ProcessedUpload> {
  return processOcrUpload(fileId, options);
}
