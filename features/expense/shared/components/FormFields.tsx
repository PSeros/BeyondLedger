import {Input, Label, ListBox, Select, TextField} from "@heroui/react";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

// Shared field label styling + primitives used by the expense create/edit forms (Bill + Contract).
export const labelClass = "text-foreground-500 text-xs uppercase tracking-wide";

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
    </TextField>
  );
}

// A labelled single-select backed by native FormData (posts the selected id as `name`).
// `defaultValue` is the selected option id as a string; omit it to start unselected.
export function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: FilterOption[];
  defaultValue?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue} className="flex flex-col gap-1">
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
