"use client";

import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import BillFilterMenu from "@/features/expense/variable/components/BillFilterMenu";
import type {BillFilterOptions} from "@/features/expense/variable/db/billFilterOptions";

type BillFilterButtonProps = {
  options: BillFilterOptions;
};

export default function BillFilterButton({options}: BillFilterButtonProps) {
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
          <BillFilterMenu options={options} className="flex w-64 flex-col gap-3 p-1"/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
