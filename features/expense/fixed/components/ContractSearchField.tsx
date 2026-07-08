"use client"

import React, {startTransition, useEffect, useRef, useState} from 'react';
import {SearchField} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useSearchShortcut} from "@/hooks/useSearchShortcut";

type ContractSearchFieldProps = {
  className?: string;
};

const DEBOUNCE_MS = 300;

export default function ContractSearchField({className}: ContractSearchFieldProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [draft, setDraft] = useState(urlQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useSearchShortcut(inputRef);

  useEffect(() => {
    setDraft(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (draft === urlQuery) {
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (draft) {
        params.set("q", draft);
      } else {
        params.delete("q");
      }

      const queryString = params.toString();

      startTransition(() => {
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, {scroll: false});
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <SearchField
      aria-label="Search expense"
      variant="secondary"
      className={className}
      value={draft}
      onChange={setDraft}
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
