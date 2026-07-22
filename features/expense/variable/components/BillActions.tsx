import React from 'react';
import {Button, ButtonGroup} from "@heroui/react";
import {LuPlus, LuUpload} from "react-icons/lu";
import BillFilterButton from "@/features/expense/variable/components/BillFilterButton";
import {getBillFilterOptions} from "@/features/expense/variable/db/billFilterOptions";

type BillActionsProps = {
  className?: string;
};

export default async function BillActions({className}: BillActionsProps) {
  const options = await getBillFilterOptions();

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <BillFilterButton options={options}/>
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
