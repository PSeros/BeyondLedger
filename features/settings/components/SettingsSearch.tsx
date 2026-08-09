"use client";

import {type Key, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {ComboBox, Input, ListBox} from "@heroui/react";
import {LuSearch} from "react-icons/lu";
import {settingsSearchIndex} from "@/features/settings/searchIndex";

// Type-ahead over every individual setting. Picking a result navigates to
// `/settings/<section>#<anchor>`, which scrolls the block into view and lights it up via the
// :target rule in globals.css — so people can find "API key" without knowing it lives under AI.
//
// The list is deliberately FLAT with the section name on each row rather than grouped into
// ListBox.Sections: a Section inside a ComboBox popover makes React 19's dev-only diff printer
// walk react-aria's synthetic collection nodes and throw "childNodes is not supported", which
// aborts the very router transition this component triggers. It works in a production build and
// breaks in `next dev`, so the grouping isn't worth it.
// A client-side router.push only rewrites the URL — the browser neither scrolls to the fragment nor
// re-evaluates :target. So scroll and flash the block ourselves, polling briefly because on a
// cross-section jump the target only exists once the new page has rendered. (A real page load with
// a #hash still gets the browser's own scroll plus the :target rule in globals.css.)
function revealAnchor(anchor: string) {
  let attempts = 0;
  const tick = () => {
    const element = document.getElementById(anchor);
    if (!element) {
      if (attempts++ < 90) requestAnimationFrame(tick);
      return;
    }
    element.scrollIntoView({block: "start", behavior: "smooth"});
    element.classList.add("anchor-flash");
    window.setTimeout(() => element.classList.remove("anchor-flash"), 2000);
  };
  requestAnimationFrame(tick);
}

export default function SettingsSearch() {
  const router = useRouter();
  const t = useTranslations();
  const tNav = useTranslations("settings.nav");
  const tSearch = useTranslations("settings.search");
  const [inputValue, setInputValue] = useState("");

  // Entries are keyed by labelKey (unique); several share an anchor, e.g. every AI field.
  function onSelectionChange(key: Key | null) {
    if (key == null) return;
    const entry = settingsSearchIndex.find((candidate) => candidate.labelKey === String(key));
    if (!entry) return;
    setInputValue("");
    router.push(`/settings/${entry.section}#${entry.anchor}`);
    revealAnchor(entry.anchor);
  }

  return (
    <ComboBox
      aria-label={tSearch("label")}
      className="w-full lg:w-72"
      fullWidth
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSelectionChange={onSelectionChange}
      // Substring match rather than the default prefix-ish match, so "key" finds "API key".
      // The section name is part of the text value, so "backup" lists everything under Backup.
      defaultFilter={(text, value) =>
        value.trim() === "" || text.toLowerCase().includes(value.trim().toLowerCase())
      }
    >
      <ComboBox.InputGroup>
        <LuSearch className="size-4 shrink-0 text-muted" aria-hidden/>
        <Input placeholder={tSearch("placeholder")}/>
      </ComboBox.InputGroup>
      <ComboBox.Popover>
        <ListBox renderEmptyState={() => (
          <p className="px-3 py-2 text-sm text-muted">{tSearch("noResults")}</p>
        )}>
          {settingsSearchIndex.map((entry) => {
            const label = t(entry.labelKey);
            const section = tNav(entry.section);
            return (
              <ListBox.Item
                key={entry.labelKey}
                id={entry.labelKey}
                textValue={`${label} ${section}`}
                className="flex items-center gap-3"
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="shrink-0 text-xs text-muted">{section}</span>
              </ListBox.Item>
            );
          })}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
