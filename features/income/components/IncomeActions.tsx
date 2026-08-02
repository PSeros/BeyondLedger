import {Button, ButtonGroup} from "@heroui/react";
import {LuFilter, LuPlus} from "react-icons/lu";

// Interim inert toolbar actions for the income tabs. The Filter button gets its popover in 9b and
// the Add button its create modal in 9f; kept inert for now so the table+search phase stands alone.
export default function IncomeActions() {
  return (
    <ButtonGroup size="md" variant="tertiary">
      <Button isDisabled>
        <LuFilter/>
        Filter
      </Button>
      <Button isDisabled>
        <ButtonGroup.Separator/>
        <LuPlus/>
        Add
      </Button>
    </ButtonGroup>
  );
}
