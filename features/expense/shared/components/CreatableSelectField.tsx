"use client";

import {type Key, type ReactNode, useRef, useState} from "react";
import {Label, ListBox, Select} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import CreatePopover, {CREATE_OPTION_ID} from "@/features/expense/shared/components/CreatePopover";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// A single-select that, in addition to its options, offers a "+ Add new…" row. Choosing it
// opens an anchored popover mini-form; on save the new row is created via `onCreate`, appended
// to the local option list, and selected — no page refresh, so a half-filled parent form is
// preserved. The current selection posts to native FormData through a hidden `<input name>`
// (like BillItemsEditor's RowSelect), so consuming server actions read it unchanged. Omit
// `name` and read selection via `onSelect` when embedding this inside another create popover
// (e.g. the supplier popover's category picker).
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
  const [creating, setCreating] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  function select(id: string) {
    setSelectedId(id);
    onSelect?.(id);
  }

  function handleChange(key: Key | null) {
    if (key === CREATE_OPTION_ID) {
      setCreating(true);
      return;
    }
    select(key != null ? String(key) : "");
  }

  async function handleCreate(draftName: string) {
    const created = await onCreate(draftName);
    setOpts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    select(String(created.id));
  }

  return (
    <div className="flex flex-col gap-1">
      <div ref={triggerRef}>
        <Select
          value={selectedId || null}
          onChange={handleChange}
          aria-label={label}
          className="flex flex-col gap-1"
        >
          <Label className={labelClass}>{label}</Label>
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
              <ListBox.Item key={CREATE_OPTION_ID} id={CREATE_OPTION_ID} textValue="Add new">
                + Add new…
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      {name ? <input type="hidden" name={name} value={selectedId}/> : null}

      <CreatePopover
        triggerRef={triggerRef}
        isOpen={creating}
        onOpenChange={setCreating}
        title={createTitle}
        extraFields={extraFields}
        canSubmit={canSubmit}
        onSubmit={handleCreate}
      />
    </div>
  );
}
