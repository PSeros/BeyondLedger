import type {FileStatusChoice} from "@/prisma/generated/client";

// A document attachment as surfaced to the detail views (view/download/delete). Bytes are served
// separately via /api/files/[id]; this is just the metadata a row needs to render.
export type FileAttachment = {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: FileStatusChoice;
  createdAt: string; // ISO
};
