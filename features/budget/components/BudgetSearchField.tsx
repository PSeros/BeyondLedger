"use client";

import {startTransition, useEffect, useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {SearchField} from "@heroui/react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useSearchShortcut} from "@/hooks/useSearchShortcut";

const DEBOUNCE_MS = 300;

// Debounced search for the Budget page, wired to the ?q URL param (read server-side to filter
// budgets by name + member category/supplier names). Mirrors BillSearchField.
export default function BudgetSearchField({className}: {className?: string}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("search");
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
    <SearchField aria-label={t("budget")} variant="secondary" className={className} value={draft} onChange={setDraft}>
      <SearchField.Group>
        <SearchField.SearchIcon/>
        <SearchField.Input
          ref={inputRef}
          className="w-lg"
          placeholder={t("placeholder")}
          aria-keyshortcuts="Control+K Meta+K"
        />
        <SearchField.ClearButton/>
      </SearchField.Group>
    </SearchField>
  );
}
