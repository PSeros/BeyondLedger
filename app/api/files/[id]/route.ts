import {readFile} from "node:fs/promises";
import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {client} from "@/lib/prisma";
import {resolveFilePath} from "@/lib/fileStorage";

type RouteContext = {params: Promise<{id: string}>};

// Serves a stored document by FileAsset id. Renders inline by default (so PDFs/images preview in
// the browser); ?download=1 forces a save dialog. Seeded rows have fabricated paths with no bytes
// on disk, so those 404 gracefully — only real uploads resolve.
export async function GET(request: NextRequest, {params}: RouteContext) {
  const {id} = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({error: "Not found"}, {status: 404});
  }

  const file = await client.fileAsset.findUnique({
    where: {id: numericId},
    select: {relativePath: true, mimeType: true, originalName: true},
  });
  if (!file) {
    return NextResponse.json({error: "Not found"}, {status: 404});
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(resolveFilePath(file.relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({error: "File is no longer available"}, {status: 404});
    }
    throw error;
  }

  const download = request.nextUrl.searchParams.get("download") === "1";
  const safeName = file.originalName.replace(/["\\\r\n]/g, "_");

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
    },
  });
}
