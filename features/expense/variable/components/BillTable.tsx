import BillDataTable from "@/features/expense/variable/components/BillDataTable";

// Thin server wrapper. The active account (Phase 14) is passed in from the page (read from the
// AppSettings singleton) and threaded into the client table's fetch so switching accounts — which
// revalidates this server render — re-runs the client effect and refetches.
export default function BillTable({activeWorkspaceId}: {activeWorkspaceId: number | null}) {
  return <BillDataTable activeWorkspaceId={activeWorkspaceId}/>;
}
