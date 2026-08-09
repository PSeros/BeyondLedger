"use client";

import {type Key, type ReactNode, useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Label, ListBox, Popover, Select} from "@heroui/react";
import {LuTrash2} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import {TAG_COLORS} from "@/features/tags/colors";

// Building blocks shared by every reference-data list on /settings/data and /settings/tags.

export function UsageNote({count}: {count: number}) {
  const t = useTranslations("settings");
  if (count === 0) {
    return <span className="text-xs text-muted">{t("unused")}</span>;
  }
  return <span className="text-xs text-muted">{t("usageCount", {count})}</span>;
}

export function RowShell({children}: {children: ReactNode}) {
  return (
    <li className="border-default flex items-center gap-2 border-b py-2 last:border-b-0">{children}</li>
  );
}

// Trash button that asks for confirmation in a small popover. Disabled (with a reason) when the
// row is still referenced — deleting would fail the FK constraint, which the action also guards.
export function DeleteButton({label, usage, disabled, onConfirm}: {
  label: string;
  usage: number;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  if (usage > 0) {
    return (
      <span title={t("inUseCantDelete")} className="inline-flex">
        <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled
                aria-label={t("deleteInUseAria", {label})}>
          <LuTrash2 className="size-4"/>
        </Button>
      </span>
    );
  }

  return (
    <Popover>
      <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled={disabled}
              aria-label={t("deleteAria", {label})}>
        <LuTrash2 className="size-4"/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-56 max-w-[calc(100vw-2rem)] flex-col gap-3">
          <p className="text-sm">{t("deleteConfirm", {label})}</p>
          <Button type="button" size="sm" variant="danger" onPress={onConfirm}>
            {tCommon("delete")}
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

// A plain (non-creatable) controlled select, used inside the supplier create/edit forms.
export function PlainSelect({label, value, options, onChange}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || null}
      onChange={(key: Key | null) => onChange(key != null ? String(key) : "")}
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
          {options.map((option) => (
            <ListBox.Item key={option.id} id={String(option.id)} textValue={option.name}>
              {option.name}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

// A swatch button that opens a small palette Popover; picking a color fires onChange and closes.
// Used both to choose a new tag/account's color and to recolor an existing one.
export function ColorPicker({value, onChange, ariaLabel, disabled}: {
  value: string;
  onChange: (color: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled={disabled} aria-label={ariaLabel}>
        <span className="border-default size-4 rounded-full border" style={{backgroundColor: value}}/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="grid grid-cols-5 gap-2">
          {TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => {
                onChange(color);
                setOpen(false);
              }}
              className="border-default size-6 rounded-full border"
              style={{
                backgroundColor: color,
                outline: color === value ? "2px solid var(--foreground)" : undefined,
                outlineOffset: "2px"
              }}
            />
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
