"use client";

import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import IncomeFilterMenu from "@/features/income/components/IncomeFilterMenu";
import type {IncomeFilterOptions} from "@/features/income/db/incomeFilterOptions";

type IncomeFilterButtonProps = {
  options: IncomeFilterOptions;
  isRecurring: boolean;
};

// `buttonProps` carries the `__button_group_child` marker ButtonGroup injects into its direct
// children — forward it to the real Button so it keeps its group styling.
export default function IncomeFilterButton({options, isRecurring, ...buttonProps}: IncomeFilterButtonProps) {
  return (
    <Popover>
      <Button {...buttonProps}>
        <LuFilter/>
        Filter
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-64 flex-col gap-3">
          <IncomeFilterMenu options={options} isRecurring={isRecurring}/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
