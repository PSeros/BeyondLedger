import React from 'react';
import {Button, ButtonGroup} from "@heroui/react";
import {LuPlus, LuUpload} from "react-icons/lu";
import ContractFilterButton from "@/features/expense/fixed/components/ContractFilterButton";
import {getContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";

type ContractActionsProps = {
  className?: string;
};

export default async function ContractActions({className}: ContractActionsProps) {
  const options = await getContractFilterOptions();

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <ContractFilterButton options={options}/>
      <Button>
        <ButtonGroup.Separator/>
        <LuUpload/>
        Upload
      </Button>
      <Button>
        <ButtonGroup.Separator/>
        <LuPlus/>
        Add
      </Button>
    </ButtonGroup>
  );
}
