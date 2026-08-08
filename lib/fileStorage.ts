import {randomUUID} from "node:crypto";
import {mkdir, unlink, writeFile} from "node:fs/promises";
import path from "node:path";

// Where uploaded document bytes live on disk. Configurable so a deployment can point at a
// mounted volume; defaults to a gitignored ./storage/uploads under the project root. Exported
// for the backup/restore routes, which bundle and swap this whole directory.
export function getStorageDir(): string {
  return process.env.FILE_STORAGE_DIR ?? path.join(process.cwd(), "storage", "uploads");
}

function baseDir(): string {
  return getStorageDir();
}

export type StoredFileMeta = {
  storedName: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
};

// Persists an uploaded File to disk under a random, collision-free name and returns the metadata
// a FileAsset row needs. The original name is kept separately (on the row) for display; only the
// generated storedName ever touches the filesystem, so a hostile filename can't escape the dir.
export async function saveUploadedFile(file: File): Promise<StoredFileMeta> {
  const ext = path.extname(file.name).toLowerCase().slice(0, 12); // keep a sane, bounded extension
  const storedName = `${randomUUID()}${ext}`;
  const relativePath = storedName; // flat layout under baseDir

  const dir = baseDir();
  await mkdir(dir, {recursive: true});

  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), bytes);

  return {
    storedName,
    relativePath,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: bytes.byteLength,
  };
}

// Resolves a stored relativePath to an absolute path, refusing anything that escapes the base dir
// (path-traversal guard). Callers pass a value read straight from the DB, so this stays defensive.
export function resolveFilePath(relativePath: string): string {
  const dir = baseDir();
  const resolved = path.resolve(dir, relativePath);
  const withSep = dir.endsWith(path.sep) ? dir : dir + path.sep;
  if (resolved !== dir && !resolved.startsWith(withSep)) {
    throw new Error("Resolved file path escapes the storage directory");
  }
  return resolved;
}

// Removes a stored file, tolerating an already-missing file (e.g. seed rows that never had bytes).
export async function deleteStoredFile(relativePath: string): Promise<void> {
  try {
    await unlink(resolveFilePath(relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
