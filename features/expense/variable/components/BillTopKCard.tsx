import BillTopKToggleCard from "@/features/expense/variable/components/BillTopKToggleCard";
import {getTopItemCategories, getTopSuppliers} from "@/features/expense/variable/db/billTopKData";
import type {BillFilters} from "@/features/expense/variable/db/billWhere";

type BillTopKCardProps = BillFilters;

export default async function BillTopKCard(filters: BillTopKCardProps) {
  const [supplierRows, itemCategoryRows] = await Promise.all([
    getTopSuppliers({...filters, limit: 4}),
    getTopItemCategories({...filters, limit: 4}),
  ]);

  return <BillTopKToggleCard supplierRows={supplierRows} itemCategoryRows={itemCategoryRows}/>;
}
