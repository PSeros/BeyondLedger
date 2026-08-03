import React from 'react';
import {ButtonGroup} from "@heroui/react";
import ContractFilterButton from "@/features/expense/fixed/components/ContractFilterButton";
import AddExpenseButton from "@/features/expense/shared/components/AddExpenseButton";
import ScanDocumentButton from "@/features/expense/shared/components/ScanDocumentButton";
import {getContractFilterOptions} from "@/features/expense/fixed/db/contractFilterOptions";
import {getExpenseFormOptions} from "@/features/expense/shared/db/expenseFormOptions";
import {getAiSettingsForm} from "@/features/settings/db/aiSettings";

type ContractActionsProps = {
  className?: string;
};

export default async function ContractActions({className}: ContractActionsProps) {
  const [filterOptions, formOptions, aiSettings] = await Promise.all([
    getContractFilterOptions(),
    getExpenseFormOptions(),
    getAiSettingsForm(),
  ]);

  return (
    <ButtonGroup size="md" variant="tertiary" className={className}>
      <ContractFilterButton options={filterOptions}/>
      <ScanDocumentButton aiEnabled={aiSettings.enabled && aiSettings.hasApiKey}/>
      <AddExpenseButton options={formOptions} defaultType="fixed"/>
    </ButtonGroup>
  );
}
