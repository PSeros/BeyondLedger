import {client} from "@/lib/prisma";
import {determineStatus, type LifecycleStatus} from "@/lib/status";

export type ContractDetailData = {
  id: number;
  name: string;
  supplier: string;
  supplierId: number;
  category: string;
  categoryId: number;
  frequency: string;
  frequencyId: number;
  documentNumber: string | null;
  amount: number;
  startDate: string; // ISO
  endDate: string | null; // ISO
  noticePeriod: number | null;
  status: LifecycleStatus;
};

export async function getContractById(id: number): Promise<ContractDetailData | null> {
  const contract = await client.contract.findUnique({
    where: {id},
    include: {supplier: true, category: true, frequency: true},
  });

  if (!contract) {
    return null;
  }

  return {
    id: contract.id,
    name: contract.name,
    supplier: contract.supplier.name,
    supplierId: contract.supplierId,
    category: contract.category.name,
    categoryId: contract.categoryId,
    frequency: contract.frequency.name,
    frequencyId: contract.frequencyId,
    documentNumber: contract.documentNumber,
    amount: Number(contract.totalAmount),
    startDate: contract.startDate.toISOString(),
    endDate: contract.endDate ? contract.endDate.toISOString() : null,
    noticePeriod: contract.noticePeriod,
    status: determineStatus(contract),
  };
}
