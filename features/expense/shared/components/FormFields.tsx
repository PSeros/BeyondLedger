"use client";

import {useTranslations} from "next-intl";
import {FieldError, Input, Label, ListBox, Select, TextField} from "@heroui/react";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// Shared field label styling + primitives used by the expense create/edit forms (Bill + Contract).
export const labelClass = "text-foreground-500 text-xs uppercase tracking-wide";

// The message under an invalid field. React Aria suppresses the browser's own error bubble and
// expects a FieldError instead; the missing-value case gets an app-localized message (the native
// one follows the *browser's* language, not the app's), anything else falls back to the native text.
// Exported because the item-row fields in BillItemsEditor are built by hand (no Label) but are
// required all the same.
export function FieldErrorMessage() {
  const t = useTranslations("errors");
  return (
    <FieldError>
      {({validationDetails, validationErrors}) =>
        validationDetails.valueMissing ? t("fieldRequired") : validationErrors.join(" ")}
    </FieldError>
  );
}

// A labelled text/number/date input backed by native FormData (posts `name`). `defaultValue`
// seeds the field ("" for a fresh create form).
export function TextInputField({
  label,
  name,
  defaultValue = "",
  type = "text",
  isRequired,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: "text" | "number" | "date";
  isRequired?: boolean;
}) {
  return (
    <TextField name={name} defaultValue={defaultValue} isRequired={isRequired} className="flex flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <Input type={type} step={type === "number" ? "any" : undefined}/>
      <FieldErrorMessage/>
    </TextField>
  );
}

// A labelled single-select backed by native FormData (posts the selected id as `name`).
// `defaultValue` is the selected option id as a string; omit it to start unselected — pair that
// with `isRequired` so an untouched select blocks submission instead of posting an empty id.
export function SelectField({
  label,
  name,
  options,
  defaultValue,
  isRequired,
}: {
  label: string;
  name: string;
  options: FilterOption[];
  defaultValue?: string;
  isRequired?: boolean;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} isRequired={isRequired} className="flex flex-col gap-1">
      <Label className={labelClass}>{label}</Label>
      <Select.Trigger>
        <Select.Value/>
        <Select.Indicator/>
      </Select.Trigger>
      <FieldErrorMessage/>
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
