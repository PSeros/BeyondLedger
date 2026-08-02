"use server";

import {revalidatePath} from "next/cache";
import {FileStatusChoice} from "@/prisma/generated/client";
import {client} from "@/lib/prisma";
import {deleteStoredFile, saveUploadedFile} from "@/lib/fileStorage";

// Pulls the uploaded File out of a FormData "file" field, rejecting empty/absent uploads.
function readUpload(formData: FormData): File {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file was uploaded");
  }
  return file;
}

// Stores an uploaded document and attaches it to an existing Bill. Files land in the UPLOADED
// state (the same lifecycle the OCR pipeline will later drive); for a plain attachment it simply
// stays there. Revalidates the list + this bill's detail so the attachment shows up immediately.
export async function uploadBillFile(billId: number, formData: FormData): Promise<void> {
  const file = readUpload(formData);
  const meta = await saveUploadedFile(file);

  await client.fileAsset.create({
    data: {
      originalName: file.name,
      storedName: meta.storedName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      relativePath: meta.relativePath,
      status: FileStatusChoice.UPLOADED,
      billId,
    },
  });

  revalidatePath("/expense/variable");
  revalidatePath(`/expense/variable/${billId}`);
}

// Stores an uploaded document and attaches it to an existing Contract.
export async function uploadContractFile(contractId: number, formData: FormData): Promise<void> {
  const file = readUpload(formData);
  const meta = await saveUploadedFile(file);

  await client.fileAsset.create({
    data: {
      originalName: file.name,
      storedName: meta.storedName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      relativePath: meta.relativePath,
      status: FileStatusChoice.UPLOADED,
      contractId,
    },
  });

  revalidatePath("/expense/fixed");
  revalidatePath(`/expense/fixed/${contractId}`);
}

// Deletes a single attachment: removes the bytes from disk (tolerating seed rows with no file)
// then the row. Revalidates whichever parent's detail the file hung off.
export async function deleteFileAsset(id: number): Promise<void> {
  const file = await client.fileAsset.findUnique({
    where: {id},
    select: {relativePath: true, billId: true, contractId: true},
  });
  if (!file) {
    return;
  }

  await deleteStoredFile(file.relativePath);
  await client.fileAsset.delete({where: {id}});

  if (file.billId != null) {
    revalidatePath("/expense/variable");
    revalidatePath(`/expense/variable/${file.billId}`);
  }
  if (file.contractId != null) {
    revalidatePath("/expense/fixed");
    revalidatePath(`/expense/fixed/${file.contractId}`);
  }
}
