import TopKTableCard from "@/components/TopKTableCard";
import {getTopSuppliers} from "@/features/expense/variable/db/billTopKData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";

type BillTopKCardProps = BillFilters;

export default async function BillTopKCard(filters: BillTopKCardProps) {
  const rows = await getTopSuppliers({...filters, limit: 5});

  return <TopKTableCard title="Top Suppliers" rows={rows}/>;
}
