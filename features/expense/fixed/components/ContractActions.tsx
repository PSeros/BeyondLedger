import React from 'react';
import {Button, ButtonGroup} from "@heroui/react";
import {LuUpload} from "react-icons/lu";
import ContractFilterButton from "@/features/expense/fixed/components/ContractFilterButton";
import AddExpenseButton from "@/features/expense/shared/components/AddExpenseButton";
import {getContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";
import {getExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";

type ContractActionsProps = {
  className?: string;
};

export default async function ContractActions({className}: ContractActionsProps) {
  const [filterOptions, formOptions] = await Promise.all([
    getContractFilterOptions(),
    getExpenseFormOptions(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <ContractFilterButton options={filterOptions}/>
      <Button>
        <ButtonGroup.Separator/>
        <LuUpload/>
        Upload
      </Button>
      <AddExpenseButton options={formOptions} defaultType="fixed"/>
    </ButtonGroup>
  );
}
