"use client";

import {type Key, type ReactNode, useState} from "react";
import {useTranslations} from "next-intl";
import {Button as AriaButton} from "react-aria-components";
import {Button, Input, Label, ListBox, Popover, TextField} from "@heroui/react";
import {LuChevronDown, LuPlus} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// A select whose dropdown is a Popover + ListBox (the HeroUI-themes pattern), with the "create
// new" affordance living in the popover header — a title plus a "+" that swaps the list for a
// small create form. This keeps the field itself a plain full-width control (no button stealing
// its width). The trigger reuses HeroUI's global field classes (select__trigger / __indicator)
// on an unstyled react-aria Button so it matches the native selects pixel-for-pixel.
//
// Selection is controlled when `value` is passed (report changes via `onSelect`; the parent owns
// the option list) and uncontrolled otherwise (internal state + a hidden `<input name>` for
// FormData, options appended locally on create). `onCreate` is optional — omit it for a plain
// picker with no "+".
export default function CreatableSelect({
  label,
  name,
  options,
  value,
  defaultValue = "",
  placeholder,
  createTitle,
  onCreate,
  onSelect,
  extraFields,
  canSubmit = true,
  className,
}: {
  label: string;
  name?: string;
  options: FilterOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  createTitle?: string;
  onCreate?: (name: string) => Promise<FilterOption>;
  onSelect?: (id: string) => void;
  extraFields?: ReactNode;
  canSubmit?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const isControlled = value !== undefined;
  const [internalId, setInternalId] = useState(defaultValue);
  const [internalOpts, setInternalOpts] = useState<FilterOption[]>(options);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "create">("list");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opts = isControlled ? options : internalOpts;
  const currentId = isControlled ? value : internalId;
  const selectedName = opts.find((option) => String(option.id) === currentId)?.name;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setMode("list");
    }
  }

  function commitSelection(id: string) {
    if (!isControlled) {
      setInternalId(id);
    }
    onSelect?.(id);
    setOpen(false);
    setMode("list");
  }

  function handleSelectionChange(keys: "all" | Set<Key>) {
    if (keys === "all") {
      return;
    }
    const first = [...keys][0];
    if (first != null) {
      commitSelection(String(first));
    }
  }

  function startCreate() {
    setDraft("");
    setError(null);
    setMode("create");
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
      if (!isControlled) {
        setInternalOpts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      commitSelection(String(created.id));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t("errors.couldNotCreate"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1${className ? ` ${className}` : ""}`}>
      <Label className={labelClass}>{label}</Label>
      <Popover isOpen={open} onOpenChange={handleOpenChange}>
        <AriaButton type="button" aria-label={label} className="select__trigger w-full min-w-0">
          <span className={`min-w-0 flex-1 truncate text-left${selectedName ? "" : " text-muted"}`}>
            {selectedName ?? placeholder ?? t("forms.select")}
          </span>
          {/* data-open drives HeroUI's own `select__indicator[data-open=true]{rotate:180deg}`
              rule (+ its built-in rotate transition), matching the native select's flip. */}
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
                      onPress={startCreate}
                    >
                      <LuPlus className="size-4"/>
                    </Button>
                  </div>
                ) : null}
                <ListBox
                  aria-label={label}
                  selectionMode="single"
                  selectedKeys={currentId ? [currentId] : []}
                  onSelectionChange={handleSelectionChange}
                  className="max-h-64 overflow-auto p-1"
                >
                  {opts.map((option) => (
                    <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
                      {option.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-3">
                <p className="text-sm font-semibold">{createTitle ?? t("forms.newLabel", {label})}</p>
                <TextField value={draft} onChange={setDraft} autoFocus aria-label={t("fields.name")} className="flex flex-col gap-1">
                  <Label className={labelClass}>{t("fields.name")}</Label>
                  <Input placeholder={t("fields.name")}/>
                </TextField>
                {extraFields}
                {error ? <p className="text-danger text-sm">{error}</p> : null}
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="tertiary" isDisabled={pending} onPress={() => setMode("list")}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="button" size="sm" variant="primary" isDisabled={pending || !canSubmit} onPress={submitCreate}>
                    {pending ? t("common.saving") : t("common.add")}
                  </Button>
                </div>
              </div>
            )}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
      {name ? <input type="hidden" name={name} value={currentId}/> : null}
    </div>
  );
}
