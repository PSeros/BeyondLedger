"use client";

import {useTranslations} from "next-intl";
import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import BillFilterMenu from "@/features/expense/variable/components/BillFilterMenu";
import type {BillFilterOptions} from "@/features/expense/variable/db/billFilterOptions";

type BillFilterButtonProps = {
  options: BillFilterOptions;
};

// `buttonProps` carries the `__button_group_child` marker ButtonGroup injects into its
// direct children — forward it to the real Button so it keeps its group styling.
export default function BillFilterButton({options, ...buttonProps}: BillFilterButtonProps) {
  const t = useTranslations("filters");
  return (
    <Popover>
      <Button {...buttonProps}>
        <LuFilter/>
        {t("filter")}
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-72 flex-col gap-3">
          <BillFilterMenu options={options}/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
