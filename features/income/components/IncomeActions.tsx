import {ButtonGroup} from "@heroui/react";
import IncomeFilterButton from "@/features/income/components/IncomeFilterButton";
import AddIncomeButton from "@/features/income/components/AddIncomeButton";
import {getIncomeFilterOptions} from "@/features/income/db/incomeFilterOptions";
import {getIncomeFormOptions} from "@/features/income/db/incomeFormOptions";

type IncomeActionsProps = {
  isRecurring: boolean;
};

// Toolbar actions for an income tab. Filter options are scoped to the tab (recurring vs one-time);
// the Add form offers all lookups (its frequency decides the tab). Income has no Upload (OCR is a
// deliberately expense-only phase).
export default async function IncomeActions({isRecurring}: IncomeActionsProps) {
  const [filterOptions, formOptions] = await Promise.all([
    getIncomeFilterOptions(isRecurring),
    getIncomeFormOptions(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary">
      <IncomeFilterButton options={filterOptions} isRecurring={isRecurring}/>
      <AddIncomeButton options={formOptions}/>
    </ButtonGroup>
  );
}
