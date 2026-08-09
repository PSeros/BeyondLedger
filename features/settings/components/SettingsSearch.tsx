"use client";

import {type Key, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {ComboBox, Header, Input, ListBox} from "@heroui/react";
import {LuSearch} from "react-icons/lu";
import {settingsSections} from "@/features/settings/nav";
import {settingsSearchIndex} from "@/features/settings/searchIndex";

// Type-ahead over every individual setting, grouped by section. Picking a result navigates to
// `/settings/<section>#<anchor>`, which scrolls the block into view and lights it up via the
// :target rule in globals.css — so people can find "API key" without knowing it lives under AI.
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
  }

  const groups = settingsSections
    .map((section) => ({
      section,
      entries: settingsSearchIndex.filter((entry) => entry.section === section.key),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <ComboBox
      aria-label={tSearch("label")}
      className="w-full lg:w-72"
      fullWidth
      inputValue={inputValue}
      onInputChange={setInputValue}
      selectedKey={null}
      onSelectionChange={onSelectionChange}
      // Substring match rather than the default prefix-ish match, so "key" finds "API key".
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
          <p className="px-2 py-1.5 text-sm text-muted">{tSearch("noResults")}</p>
        )}>
          {groups.map((group) => (
            <ListBox.Section key={group.section.key}>
              <Header>{tNav(group.section.key)}</Header>
              {group.entries.map((entry) => (
                <ListBox.Item key={entry.labelKey} id={entry.labelKey} textValue={t(entry.labelKey)}>
                  {t(entry.labelKey)}
                </ListBox.Item>
              ))}
            </ListBox.Section>
          ))}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  );
}
