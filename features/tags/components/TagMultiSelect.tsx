"use client";

import {type Key, useEffect, useState} from "react";
import {useTranslations} from "next-intl";
import {Button as AriaButton} from "react-aria-components";
import {Button, Input, Label, ListBox, Popover, TextField} from "@heroui/react";
import {LuChevronDown, LuPlus} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import TagChip from "@/components/TagChip";
import type {TagOption} from "@/features/tags/types";

// A multi-select of tags for entry forms. Uncontrolled: it owns the selected-id set (seeded from
// `defaultValue`) and mirrors it into hidden <input name={name}> elements so a plain <form> posts
// them (the server action reads them via parseTagIds). Selected tags render as colored chips in the
// trigger; the popover is a multi-select ListBox with a color dot per option, plus an inline
// "+ create" affordance (new tags get the default color — recolor later in Settings). Modeled on
// CreatableSelect so the trigger matches the native selects pixel-for-pixel.
export default function TagMultiSelect({
  label,
  name = "tagId",
  options,
  defaultValue = [],
  onCreate,
  onChange,
  placeholder,
}: {
  label: string;
  name?: string;
  options: TagOption[];
  defaultValue?: string[];
  onCreate?: (name: string) => Promise<TagOption>;
  // Reports the selected ids on change — used where the picker is read from state (e.g. the OCR
  // upload dialog) rather than posted as hidden inputs by a <form>.
  onChange?: (ids: string[]) => void;
  placeholder?: string;
}) {
  const t = useTranslations();
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultValue);
  const [opts, setOpts] = useState<TagOption[]>(options);

  useEffect(() => {
    onChange?.(selectedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = opts.filter((option) => selectedIds.includes(String(option.id)));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMode("list");
    }
  }

  function handleSelectionChange(keys: "all" | Set<Key>) {
    setSelectedIds(keys === "all" ? opts.map((o) => String(o.id)) : [...keys].map(String));
  }

  async function submitCreate() {
    if (!onCreate) {
      return;
    }
    const trimmed = draft.trim();
    if (trimmed === "") {
      setError(t("errors.nameRequired"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const created = await onCreate(trimmed);
      setOpts((prev) =>
        prev.some((o) => o.id === created.id)
          ? prev
          : [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setSelectedIds((prev) => (prev.includes(String(created.id)) ? prev : [...prev, String(created.id)]));
      setDraft("");
      setMode("list");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("errors.couldNotCreate"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <Popover isOpen={open} onOpenChange={handleOpenChange}>
        <AriaButton type="button" aria-label={label} className="select__trigger h-auto min-h-9 w-full min-w-0">
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1 text-left">
            {selected.length > 0 ? (
              selected.map((tag) => <TagChip key={tag.id} name={tag.name} color={tag.color}/>)
            ) : (
              <span className="text-muted">{placeholder ?? t("tags.placeholder")}</span>
            )}
          </span>
          <span className="select__indicator" data-slot="select-default-indicator" data-open={open}>
            <LuChevronDown className="size-4"/>
          </span>
        </AriaButton>

        <Popover.Content>
          <Popover.Dialog className="w-(--trigger-width) min-w-56 p-0">
            {mode === "list" ? (
              <div className="flex flex-col">
                {onCreate ? (
                  <div className="border-default flex items-center justify-between border-b px-3 py-2">
                    <span className={labelClass}>{label}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="tertiary"
                      isIconOnly
                      aria-label={t("forms.addLabel", {label})}
                      className="size-7 min-h-0! min-w-0! p-0!"
                      onPress={() => {
                        setDraft("");
                        setError(null);
                        setMode("create");
                      }}
                    >
                      <LuPlus className="size-4"/>
                    </Button>
                  </div>
                ) : null}
                {opts.length === 0 ? (
                  <p className="text-muted px-3 py-3 text-sm">{t("tags.noneYet")}</p>
                ) : (
                  <ListBox
                    aria-label={label}
                    selectionMode="multiple"
                    selectedKeys={new Set(selectedIds)}
                    onSelectionChange={handleSelectionChange}
                    className="max-h-64 overflow-auto p-1"
                  >
                    {opts.map((option) => (
                      <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
                        <span className="size-2.5 shrink-0 rounded-full" style={{backgroundColor: option.color}}/>
                        {option.name}
                        <ListBox.ItemIndicator/>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-3">
                <p className="text-sm font-semibold">{t("forms.newLabel", {label})}</p>
                <TextField value={draft} onChange={setDraft} autoFocus aria-label={t("fields.name")} className="flex flex-col gap-1">
                  <Label className={labelClass}>{t("fields.name")}</Label>
                  <Input placeholder={t("fields.name")}/>
                </TextField>
                {error ? <p className="text-danger text-sm">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="tertiary" isDisabled={pending} onPress={() => setMode("list")}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" size="sm" variant="primary" isDisabled={pending} onPress={submitCreate}>
                    {pending ? t("common.saving") : t("common.add")}
                  </Button>
                </div>
              </div>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      {selectedIds.map((id) => (
        <input key={id} type="hidden" name={name} value={id}/>
      ))}
    </div>
  );
}
