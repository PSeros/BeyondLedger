import {client} from "@/lib/prisma";
import {determineStatus, type LifecycleStatus} from "@/lib/status";
import type {TagOption} from "@/features/tags/types";
import type {FileAttachment} from "@/features/expense/shared/db/fileTypes";
import type {WorkspaceOption} from "@/features/workspaces/types";

export type SavingDetailData = {
  id: number;
  name: string;
  target: string;
  targetId: number;
  frequency: string;
  frequencyId: number;
  isRecurring: boolean;
  isOpening: boolean;
  amount: number;
  startDate: string; // ISO
  endDate: string | null; // ISO
  status: LifecycleStatus;
  workspaceId: number;
  workspace: WorkspaceOption;
  tags: TagOption[];
  files: FileAttachment[];
};

export async function getSavingById(id: number): Promise<SavingDetailData | null> {
  const saving = await client.saving.findUnique({
    where: {id},
    include: {
      target: true,
      frequency: true,
      workspace: true,
      tags: {include: {tag: true}},
      files: {orderBy: {createdAt: "desc"}},
    },
  });

  if (!saving) {
    return null;
  }

  return {
    id: saving.id,
    name: saving.name,
    target: saving.target.name,
    targetId: saving.targetId,
    frequency: saving.frequency.name,
    frequencyId: saving.frequencyId,
    isRecurring: saving.frequency.isRecurring,
    isOpening: saving.isOpening,
    amount: Number(saving.totalAmount),
    startDate: saving.startDate.toISOString(),
    endDate: saving.endDate ? saving.endDate.toISOString() : null,
    status: determineStatus(saving),
    workspaceId: saving.workspaceId,
    workspace: {id: saving.workspace.id, name: saving.workspace.name, color: saving.workspace.color},
    tags: saving.tags.map((entry) => ({id: entry.tag.id, name: entry.tag.name, color: entry.tag.color})),
    files: saving.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      status: file.status,
      createdAt: file.createdAt.toISOString(),
    })),
  };
}
