import {ButtonGroup} from "@heroui/react";
import BudgetFilterButton from "@/features/budget/components/BudgetFilterButton";
import BudgetFormButton from "@/features/budget/components/BudgetFormButton";
import type {BudgetMemberOptions} from "@/features/budget/db/budgets";

// The Budget page's right-hand toolbar group: filter + add, mirroring BillActions/IncomeActions.
export default function BudgetActions({options}: { options: BudgetMemberOptions }) {
  return (
    <ButtonGroup size="md" variant="tertiary">
      <BudgetFilterButton/>
      <BudgetFormButton options={options}/>
    </ButtonGroup>
  );
}
