import {getContracts} from "../db/db";
import {determineStatus} from "@/lib/status";
import ContractDataTable from "./ContractDataTable";

type ContractTableProps = {
  contracts: Awaited<ReturnType<typeof getContracts>>;
};

export default function ContractTable({contracts}: ContractTableProps) {
  const rows = contracts.map((contract) => ({
    id: contract.id,
    name: contract.name,
    supplier: contract.supplier.name,
    category: contract.category.name,
    totalAmount: Number(contract.totalAmount),
    frequency: contract.frequency.name,
    status: determineStatus({
      startDate: contract.startDate,
      endDate: contract.endDate,
    }),
  }));

  return <ContractDataTable contracts={rows}/>;
}
