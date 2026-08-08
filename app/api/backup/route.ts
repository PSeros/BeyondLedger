import {spawn} from "node:child_process";
import {mkdir, mkdtemp, rm, symlink} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {Readable} from "node:stream";

import {client} from "@/lib/prisma";
import {ARCHIVE_DB_NAME, ARCHIVE_UPLOADS_DIR, backupStamp} from "@/lib/backup";
import {getStorageDir} from "@/lib/fileStorage";

// Native modules (child_process, fs) — must run on Node, never the Edge runtime. Never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Streams a complete backup as a .tar.gz: a CONSISTENT snapshot of the SQLite DB (via
// `VACUUM INTO`, so a concurrent write never yields a half-written file) plus the whole uploads
// directory. Archive layout is fixed (beyondledger.db + uploads/) regardless of the deployment's
// real paths, so restore can rely on it. tar is streamed straight to the response — no buffering.
export async function GET() {
  const uploadsDir = getStorageDir();
  const tmp = await mkdtemp(path.join(os.tmpdir(), "bl-backup-"));

  try {
    const snapshot = path.join(tmp, ARCHIVE_DB_NAME);
    await client.$executeRawUnsafe(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`);

    // Ensure uploads exists (empty on a fresh install) and expose it under the fixed archive name
    // via a symlink, so `tar -h` archives it as "uploads/…" no matter its real basename.
    await mkdir(uploadsDir, {recursive: true});
    await symlink(uploadsDir, path.join(tmp, ARCHIVE_UPLOADS_DIR));

    const tar = spawn(
      "tar",
      ["-czhf", "-", "-C", tmp, ARCHIVE_DB_NAME, ARCHIVE_UPLOADS_DIR],
      {stdio: ["ignore", "pipe", "pipe"]},
    );
    // Clean up the temp snapshot once tar has read everything.
    tar.on("close", () => void rm(tmp, {recursive: true, force: true}));
    tar.stderr.resume(); // drain, don't deadlock on a full stderr pipe

    const body = Readable.toWeb(tar.stdout) as ReadableStream<Uint8Array>;
    return new Response(body, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="beyondledger-backup-${backupStamp()}.tar.gz"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    await rm(tmp, {recursive: true, force: true});
    return Response.json(
      {error: error instanceof Error ? error.message : "Backup failed"},
      {status: 500},
    );
  }
}
