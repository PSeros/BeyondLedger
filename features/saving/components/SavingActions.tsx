import {ButtonGroup} from "@heroui/react";
import SavingFilterButton from "@/features/saving/components/SavingFilterButton";
import AddSavingButton from "@/features/saving/components/AddSavingButton";
import {getSavingFilterOptions} from "@/features/saving/db/savingFilterOptions";
import {getSavingFormOptions} from "@/features/saving/db/savingFormOptions";

type SavingActionsProps = {
  isRecurring: boolean;
};

// Toolbar actions for a saving tab: tab-scoped filters + the Add modal.
export default async function SavingActions({isRecurring}: SavingActionsProps) {
  const [filterOptions, formOptions] = await Promise.all([
    getSavingFilterOptions(isRecurring),
    getSavingFormOptions(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary">
      <SavingFilterButton options={filterOptions} isRecurring={isRecurring}/>
      <AddSavingButton options={formOptions}/>
    </ButtonGroup>
  );
}
