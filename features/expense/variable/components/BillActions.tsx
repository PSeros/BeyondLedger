import React from 'react';
import {ButtonGroup} from "@heroui/react";
import BillFilterButton from "@/features/expense/variable/components/BillFilterButton";
import AddExpenseButton from "@/features/expense/shared/components/AddExpenseButton";
import ScanDocumentButton from "@/features/expense/shared/components/ScanDocumentButton";
import {getBillFilterOptions} from "@/features/expense/variable/db/billFilterOptions";
import {getExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";

type BillActionsProps = {
  className?: string;
};

export default async function BillActions({className}: BillActionsProps) {
  const [filterOptions, formOptions, aiSettings] = await Promise.all([
    getBillFilterOptions(),
    getExpenseFormOptions(),
    getAiSettingsForm(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <BillFilterButton options={filterOptions}/>
      <ScanDocumentButton
        aiEnabled={aiSettings.enabled && aiSettings.hasApiKey}
        workspaces={formOptions.workspaces}
        tags={formOptions.tags}
        defaultWorkspaceId={formOptions.defaultWorkspaceId}
      />
      <AddExpenseButton options={formOptions} defaultType="variable"/>
    </ButtonGroup>
  );
}
