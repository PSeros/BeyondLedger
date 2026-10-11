import {client} from "@/lib/prisma";

// Unfiltered — feeds the dashboard's "nothing recorded yet" check.
export async function getSavingCount(): Promise<number> {
  return client.saving.count();
}
