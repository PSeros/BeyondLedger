import {Button, ButtonGroup} from "@heroui/react";
import {LuPlus} from "react-icons/lu";
import IncomeFilterButton from "@/features/income/components/IncomeFilterButton";
import {getIncomeFilterOptions} from "@/features/income/db/incomeFilterOptions";

type IncomeActionsProps = {
  isRecurring: boolean;
};

// Toolbar actions for an income tab. Filter options are scoped to the tab (recurring vs one-time).
// The Add button gets its create modal in 9f; kept inert for now. Income has no Upload (OCR is a
// deliberately expense-only phase).
export default async function IncomeActions({isRecurring}: IncomeActionsProps) {
  const filterOptions = await getIncomeFilterOptions(isRecurring);

  return (
    <ButtonGroup size="md" variant="tertiary">
      <IncomeFilterButton options={filterOptions} isRecurring={isRecurring}/>
      <Button isDisabled>
        <ButtonGroup.Separator/>
        <LuPlus/>
        Add
      </Button>
    </ButtonGroup>
  );
}
