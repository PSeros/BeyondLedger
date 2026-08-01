import React from 'react';
import {Button, ButtonGroup} from "@heroui/react";
import {LuUpload} from "react-icons/lu";
import BillFilterButton from "@/features/expense/variable/components/BillFilterButton";
import AddExpenseButton from "@/features/expense/shared/components/AddExpenseButton";
import {getBillFilterOptions} from "@/features/expense/variable/db/billFilterOptions";
import {getExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";

type BillActionsProps = {
  className?: string;
};

export default async function BillActions({className}: BillActionsProps) {
  const [filterOptions, formOptions] = await Promise.all([
    getBillFilterOptions(),
    getExpenseFormOptions(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <BillFilterButton options={filterOptions}/>
      <Button>
        <ButtonGroup.Separator/>
        <LuUpload/>
        Upload
      </Button>
      <AddExpenseButton options={formOptions} defaultType="variable"/>
    </ButtonGroup>
  );
}
