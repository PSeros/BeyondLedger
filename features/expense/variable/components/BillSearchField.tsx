"use client"

import React, {useRef} from 'react';
import {SearchField} from "@heroui/react";
import {useBillFilterStore} from "@/features/expense/variable/store/billFilterStore";
import {useSearchShortcut} from "@/hooks/useSearchShortcut";

type BillSearchFieldProps = {
  className?: string;
};

export default function BillSearchField({className}: BillSearchFieldProps) {
  const search = useBillFilterStore((state) => state.search);
  const setSearch = useBillFilterStore((state) => state.setSearch);
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
