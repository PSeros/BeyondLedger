"use client";

import {useTranslations} from "next-intl";
import {Button, Popover} from "@heroui/react";
import {LuFilter} from "react-icons/lu";
import SavingFilterMenu from "@/features/saving/components/SavingFilterMenu";
import type {SavingFilterOptions} from "@/features/saving/db/savingFilterOptions";

type SavingFilterButtonProps = {
  options: SavingFilterOptions;
  isRecurring: boolean;
};

// `buttonProps` carries the `__button_group_child` marker ButtonGroup injects into its direct
// children — forward it to the real Button so it keeps its group styling.
export default function SavingFilterButton({options, isRecurring, ...buttonProps}: SavingFilterButtonProps) {
  const t = useTranslations("filters");
  return (
    <Popover>
      <Button {...buttonProps} aria-label={t("filter")}>
        <LuFilter/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-64 max-w-[calc(100vw-2rem)] flex-col gap-3">
          <SavingFilterMenu options={options} isRecurring={isRecurring}/>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
