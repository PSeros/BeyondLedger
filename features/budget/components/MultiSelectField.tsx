"use client";

import type {Key} from "@heroui/react";
import {Label, ListBox, Select} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// A labelled multi-select, built exactly like the HeroUI "controlled multiple" Select example:
// selectionMode="multiple" with the HeroUI value/onChange (array of keys) API — NOT react-aria's
// selectedKeys/onSelectionChange — and a ListBox.ItemIndicator per item for the check marker. The
// parent owns the selected id array (strings) and mirrors it into hidden inputs for FormData.
export default function MultiSelectField({
  label,
  options,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  options: FilterOption[];
  value: string[];
  onChange: (keys: string[]) => void;
  placeholder: string;
}) {
  return (
    <Select
      selectionMode="multiple"
      value={value}
      onChange={(keys) => onChange((keys as Key[]).map(String))}
      placeholder={placeholder}
      className="flex min-w-0 flex-col gap-1"
    >
      <Label className={labelClass}>{label}</Label>
      <Select.Trigger>
        <Select.Value/>
        <Select.Indicator/>
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode="multiple">
          {options.map((option) => (
            <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
              {option.name}
              <ListBox.ItemIndicator/>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
