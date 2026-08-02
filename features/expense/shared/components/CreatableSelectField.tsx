"use client";

import {type Key, type ReactNode, useState} from "react";
import {Label, ListBox, Select} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import CreatePopover from "@/features/expense/shared/components/CreatePopover";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// A single-select paired with a "+" button that opens an anchored create popover; on save the new
// row is created via `onCreate`, appended to the local option list, and selected — no page refresh,
// so a half-filled parent form is preserved. The current selection posts to native FormData through
// a hidden `<input name>`, so consuming server actions read it unchanged. Omit `name` and read
// selection via `onSelect` when embedding this inside another create popover (e.g. the supplier
// popover's category picker).
export default function CreatableSelectField({
  label,
  name,
  options,
  defaultValue = "",
  createTitle,
  onCreate,
  onSelect,
  extraFields,
  canSubmit,
}: {
  label: string;
  name?: string;
  options: FilterOption[];
  defaultValue?: string;
  createTitle: string;
  onCreate: (name: string) => Promise<FilterOption>;
  onSelect?: (id: string) => void;
  extraFields?: ReactNode;
  canSubmit?: boolean;
}) {
  const [opts, setOpts] = useState<FilterOption[]>(options);
  const [selectedId, setSelectedId] = useState<string>(defaultValue);

  function select(id: string) {
    setSelectedId(id);
    onSelect?.(id);
  }

  async function handleCreate(draftName: string) {
    const created = await onCreate(draftName);
    setOpts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    select(String(created.id));
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <div className="flex min-w-0 items-center gap-2">
        <Select
          value={selectedId || null}
          onChange={(key: Key | null) => select(key != null ? String(key) : "")}
          aria-label={label}
          className="flex min-w-0 flex-1 flex-col gap-1"
        >
          <Select.Trigger>
            <Select.Value/>
            <Select.Indicator/>
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {opts.map((option) => (
                <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
                  {option.name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <CreatePopover
          title={createTitle}
          triggerLabel={`Add ${label.toLowerCase()}`}
          extraFields={extraFields}
          canSubmit={canSubmit}
          onSubmit={handleCreate}
        />
      </div>
      {name ? <input type="hidden" name={name} value={selectedId}/> : null}
    </div>
  );
}
