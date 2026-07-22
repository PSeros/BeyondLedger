"use client";

import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import ContractFilterMenu from "@/features/expense/fixed/components/ContractFilterMenu";
import type {ContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";

type ContractFilterButtonProps = {
  options: ContractFilterOptions;
};

export default function ContractFilterButton({options}: ContractFilterButtonProps) {
  return (
    <Popover>
      <Popover.Trigger>
        <Button>
          <LuFilter/>
          Filter
        </Button>
      </Popover.Trigger>
      <Popover.Content>
        <Popover.Dialog>
          <ContractFilterMenu options={options} className="flex w-64 flex-col gap-3 p-1"/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
