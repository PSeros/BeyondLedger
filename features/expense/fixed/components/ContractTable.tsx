import ContractDataTable from "@/features/expense/fixed/components/ContractDataTable";

// Thin server wrapper. The active account (Phase 14) is threaded into the client table's fetch so
// switching accounts — which revalidates this server render — refetches with the new account.
export default function ContractTable({activeWorkspaceId}: {activeWorkspaceId: number | null}) {
  return <ContractDataTable activeWorkspaceId={activeWorkspaceId}/>;
}
