import {execFile} from "node:child_process";
import {existsSync} from "node:fs";
import {cp, copyFile, mkdir, mkdtemp, rename, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {promisify} from "node:util";

import {getDatabaseFilePath, ARCHIVE_DB_NAME, ARCHIVE_UPLOADS_DIR, backupStamp} from "@/lib/backup";
import {getStorageDir} from "@/lib/fileStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileP = promisify(execFile);

// Restores a backup produced by GET /api/backup. Extracts the archive, validates the DB
// (SQLite integrity + a known BeyondLedger table), then atomically swaps the live DB and uploads
// directory into place — keeping the previous copies as timestamped ".bak" for recovery. Because
// the running better-sqlite3 connection holds the old DB open, the new data only takes effect on
// a process restart: in production the route exits (systemd Restart=always brings it back in ~2s);
// in dev it reports that a manual restart is needed.
export async function POST(request: Request) {
  let dbPath: string;
  let uploadsDir: string;
  try {
    dbPath = getDatabaseFilePath();
    uploadsDir = getStorageDir();
  } catch (error) {
    return Response.json({error: (error as Error).message}, {status: 500});
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("archive");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({error: "No backup archive was uploaded"}, {status: 400});
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "bl-restore-"));
  try {
    const archivePath = path.join(tmp, "backup.tar.gz");
    await writeFile(archivePath, Buffer.from(await file.arrayBuffer()));

    const extractDir = path.join(tmp, "extract");
    await mkdir(extractDir);
    try {
      await execFileP("tar", ["-xzf", archivePath, "-C", extractDir]);
    } catch {
      return Response.json({error: "Could not read the archive (not a valid .tar.gz)"}, {status: 400});
    }

    const newDb = path.join(extractDir, ARCHIVE_DB_NAME);
    const newUploads = path.join(extractDir, ARCHIVE_UPLOADS_DIR);
    if (!existsSync(newDb)) {
      return Response.json({error: `Archive is missing ${ARCHIVE_DB_NAME}`}, {status: 400});
    }

    // Validate the database before touching live data.
    const Database = (await import("better-sqlite3")).default;
    const probe = new Database(newDb, {readonly: true, fileMustExist: true});
    try {
      const integrity = probe.pragma("integrity_check", {simple: true});
      const isBeyondLedger = probe
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='AppSettings'")
        .get();
      if (integrity !== "ok") {
        return Response.json({error: "The database in the archive failed its integrity check"}, {status: 400});
      }
      if (!isBeyondLedger) {
        return Response.json({error: "This does not look like a BeyondLedger backup"}, {status: 400});
      }
    } finally {
      probe.close();
    }

    // Swap in the restored data, keeping the current copies as .bak-<stamp>.
    const stamp = backupStamp();
    if (existsSync(dbPath)) {
      await rename(dbPath, `${dbPath}.bak-${stamp}`);
    }
    // Drop any stale WAL sidecars so SQLite can't replay them onto the restored file.
    await rm(`${dbPath}-wal`, {force: true});
    await rm(`${dbPath}-shm`, {force: true});
    await copyFile(newDb, dbPath);

    if (existsSync(newUploads)) {
      if (existsSync(uploadsDir)) {
        await rename(uploadsDir, `${uploadsDir}.bak-${stamp}`);
      }
      await cp(newUploads, uploadsDir, {recursive: true});
    }

    const restarting = process.env.NODE_ENV === "production";
    if (restarting) {
      // Let the response flush, then exit so systemd restarts with the restored DB.
      setTimeout(() => process.exit(0), 800);
    }
    return Response.json({ok: true, restarting});
  } catch (error) {
    return Response.json(
      {error: error instanceof Error ? error.message : "Restore failed"},
      {status: 500},
    );
  } finally {
    await rm(tmp, {recursive: true, force: true});
  }
}
