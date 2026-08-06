import {client} from "@/lib/prisma";
import type {WorkspaceOption} from "@/features/workspaces/types";

// Read side for the account list — feeds the Topbar switcher and every form's account picker.
// SERVER-ONLY (imports the Prisma client).
export async function getWorkspaces(): Promise<WorkspaceOption[]> {
  return client.workspace.findMany({
    select: {id: true, name: true, color: true},
    orderBy: {name: "asc"},
  });
}
