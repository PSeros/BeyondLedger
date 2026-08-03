"use client";

import {useTranslations} from "next-intl";
import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import ContractFilterMenu from "@/features/expense/fixed/components/ContractFilterMenu";
import type {ContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";

type ContractFilterButtonProps = {
  options: ContractFilterOptions;
};

// `buttonProps` carries the `__button_group_child` marker ButtonGroup injects into its
// direct children — forward it to the real Button so it keeps its group styling.
export default function ContractFilterButton({options, ...buttonProps}: ContractFilterButtonProps) {
  const t = useTranslations("filters");
  return (
    <Popover>
      <Button {...buttonProps}>
        <LuFilter/>
        {t("filter")}
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-64 flex-col gap-3">
          <ContractFilterMenu options={options}/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
