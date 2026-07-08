"use client"

import React, {useRef} from 'react';
import {SearchField} from "@heroui/react";
import {useContractFilterStore} from "@/features/expense/fixed/store/contractFilterStore";
import {useSearchShortcut} from "@/hooks/useSearchShortcut";

type ContractSearchFieldProps = {
  className?: string;
};

export default function ContractSearchField({className}: ContractSearchFieldProps) {
  const search = useContractFilterStore((state) => state.search)
  const setSearch = useContractFilterStore((state) => state.setSearch)

  const inputRef = useRef<HTMLInputElement>(null);
  useSearchShortcut(inputRef);

  return (
    <SearchField
      aria-label="Search expense"
      variant="secondary"
      className={className}
      value={search}
      onChange={setSearch}
    >
      <SearchField.Group>
        <SearchField.SearchIcon/>
        <SearchField.Input
          ref={inputRef}
          className="w-lg"
          placeholder="Search..."
          aria-keyshortcuts="Control+K Meta+K"
        />
        <SearchField.ClearButton/>
      </SearchField.Group>
    </SearchField>
  );
}
