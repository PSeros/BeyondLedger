import TopKTableCard from "@/components/TopKTableCard";
import {getTopSuppliers} from "@/features/expense/variable/db/billTopKData";

type BillTopKCardProps = {
  q?: string;
};

export default async function BillTopKCard({q}: BillTopKCardProps) {
  const rows = await getTopSuppliers({q, limit: 5});

  return <TopKTableCard title="Top Suppliers" rows={rows}/>;
}
