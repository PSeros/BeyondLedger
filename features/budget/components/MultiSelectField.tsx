"use client";

import type {Key} from "@heroui/react";
import {Label, ListBox, Select} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// A labelled TRI-STATE multi-select: each value is included (+), excluded (−) or unpicked, cycled by
// clicking it. Built on the HeroUI "controlled multiple" Select (the array `value`/`onChange` API,
// NOT react-aria's selectedKeys/onSelectionChange).
//
// The trick: the Select's `value` holds BOTH included and excluded ids, so react-aria renders every
// picked value as selected and a click on one arrives as a de-selection. We read that de-selection
// as "advance to the next state" — include → exclude → off — which is what turns react-aria's
// two-state listbox into a three-state one without forking the component. The check indicator is
// replaced by an explicit +/− marker, since "selected" alone can no longer tell you the sign.

export type TriStateValue = {included: string[]; excluded: string[]};

export default function MultiSelectField({
  label,
  options,
  value,
  onChange,
  placeholder,
  summary,
}: {
  label: string;
  options: FilterOption[];
  value: TriStateValue;
  onChange: (next: TriStateValue) => void;
  placeholder: string;
  // Renders the trigger text for the current pick (the default Select.Value would list excluded
  // values as if they counted).
  summary: (value: TriStateValue) => string | null;
}) {
  const picked = [...value.included, ...value.excluded];

  function handleChange(rawKeys: Key[]): void {
    const keys = rawKeys.map(String);
    const next = new Set(keys);
    // Newly ticked → included. Untocked → include becomes exclude, exclude falls off.
    const added = keys.filter((key) => !picked.includes(key));
    const included = value.included.filter((id) => next.has(id)).concat(added);
    const demoted = value.included.filter((id) => !next.has(id));
    const excluded = value.excluded.filter((id) => next.has(id)).concat(demoted);
    onChange({included, excluded});
  }

  const triggerText = summary(value);

  return (
    <Select
      selectionMode="multiple"
      value={picked}
      onChange={(keys) => handleChange(keys as Key[])}
      placeholder={placeholder}
      className="flex min-w-0 flex-col gap-1"
    >
      <Label className={labelClass}>{label}</Label>
      <Select.Trigger>
        <span className={`min-w-0 flex-1 truncate text-start ${triggerText ? "" : "text-muted"}`}>
          {triggerText ?? placeholder}
        </span>
        <Select.Indicator/>
      </Select.Trigger>
      <Select.Popover>
        <ListBox selectionMode="multiple">
          {options.map((option) => {
            const id = String(option.id);
            const isExcluded = value.excluded.includes(id);
            const isIncluded = value.included.includes(id);
            return (
              <ListBox.Item key={option.id} id={id} textValue={option.name}>
                <span className={`min-w-0 flex-1 truncate ${isExcluded ? "text-muted line-through" : ""}`}>
                  {option.name}
                </span>
                <span
                  aria-hidden="true"
                  className={`ms-2 w-3 shrink-0 text-center font-semibold ${
                    isExcluded ? "text-danger" : isIncluded ? "text-success" : "opacity-0"
                  }`}
                >
                  {isExcluded ? "−" : "+"}
                </span>
              </ListBox.Item>
            );
          })}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
