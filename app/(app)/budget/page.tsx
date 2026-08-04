import BudgetManager from "@/features/budget/components/BudgetManager";
import BudgetEmptyState from "@/features/budget/components/BudgetEmptyState";
import {getBudgetCount, getBudgetMemberOptions, getBudgetsResolved} from "@/features/budget/db/budgets";

// The Budget page: user-defined budgets (name + period + target + category members), each showing
// target vs. actual vs. remaining for its own current period.
export default async function BudgetPage() {
  const count = await getBudgetCount();
  const options = await getBudgetMemberOptions();

  if (count === 0) {
    return <BudgetEmptyState options={options}/>;
  }

  const budgets = await getBudgetsResolved();
  return <BudgetManager budgets={budgets} options={options}/>;
}
