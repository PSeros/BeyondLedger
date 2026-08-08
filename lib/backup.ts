import path from "node:path";

// SERVER-ONLY. Shared helpers for the backup/restore API routes.

// Resolves the SQLite database file from DATABASE_URL ("file:/abs/path.db" or "file:./rel.db").
// Relative paths resolve against the project root (process.cwd()), matching how Prisma/the
// better-sqlite3 adapter open the file.
export function getDatabaseFilePath(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!url.startsWith("file:")) {
    throw new Error("Backup/restore only supports a SQLite (file:) database");
  }
  const raw = url.slice("file:".length);
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

// Members inside the .tar.gz archive (fixed names, independent of the deployment's paths).
export const ARCHIVE_DB_NAME = "beyondledger.db";
export const ARCHIVE_UPLOADS_DIR = "uploads";

// A filesystem-safe UTC timestamp, e.g. 2026-08-08-22-15-30 — used in filenames and .bak suffixes.
export function backupStamp(): string {
  return new Date().toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
}
