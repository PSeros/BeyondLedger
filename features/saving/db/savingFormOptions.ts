import {client} from "@/lib/prisma";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {TagOption} from "@/features/tags/types";
import type {WorkspaceOption} from "@/features/workspaces/types";
import {getWorkspaces} from "@/features/workspaces/db/workspaces";
import {getActiveWorkspaceId} from "@/features/settings/db/appSettings";
import {DEFAULT_WORKSPACE_ID} from "@/features/workspaces/workspaceFormData";

export type SavingFormOptions = {
  targets: FilterOption[];
  frequencies: FilterOption[];
  tags: TagOption[];
  workspaces: WorkspaceOption[];
  // Preselected by the target card's Withdraw action.
  oneOffFrequencyId: string | undefined;
  // The account a NEW saving defaults to (the edit form overrides with the saving's own account).
  defaultWorkspaceId: string;
};

// The add/edit form offers every target/frequency; the chosen frequency decides the tab.
export async function getSavingFormOptions(): Promise<SavingFormOptions> {
  const [targets, frequencies, tags, workspaces, activeWorkspaceId] = await Promise.all([
    client.savingTarget.findMany({where: {closedAt: null}, select: {id: true, name: true}, orderBy: {name: "asc"}}),
    client.frequency.findMany({select: {id: true, name: true, isRecurring: true}, orderBy: {value: "asc"}}),
    client.tag.findMany({select: {id: true, name: true, color: true}, orderBy: {name: "asc"}}),
    getWorkspaces(),
    getActiveWorkspaceId(),
  ]);

  return {
    targets,
    frequencies: frequencies.map(({id, name}) => ({id, name})),
    oneOffFrequencyId: frequencies.find((f) => !f.isRecurring)?.id.toString(),
    tags,
    workspaces,
    defaultWorkspaceId: String(activeWorkspaceId ?? DEFAULT_WORKSPACE_ID),
  };
}
