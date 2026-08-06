// The default account id — the seeded "Shared" workspace (id 1, created in the add_workspaces
// migration). Used as the fallback when a form somehow posts no/invalid workspaceId so a record is
// never left without an account.
export const DEFAULT_WORKSPACE_ID = 1;

// Reads the single account id an entry/budget form posts. WorkspaceSelect renders one hidden
// <input name="workspaceId">, pre-selected to the active account. Falls back to Shared if absent.
export function parseWorkspaceId(formData: FormData): number {
  const value = Number(formData.get("workspaceId"));
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_WORKSPACE_ID;
}
