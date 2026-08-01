"use client";

import {Button, Input, Label, ListBox, Select, TextField} from "@heroui/react";
import {LuPlus, LuTrash2} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";

export function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

// One editable line-item row. `uid` is a stable client-only React key (rows are added/removed,
// so a DB id isn't available for new rows); `id` is the DB id (empty for a not-yet-saved row,
// which is every row on the create form).
export type ItemRow = {
  uid: string;
  id: string;
  name: string;
  categoryId: string;
  quantity: string;
  unitPrice: string;
  warranty: string;
};

let uidCounter = 0;

function nextUid(): string {
  uidCounter += 1;
  return `row-${uidCounter}`;
}

// Maps a persisted bill item (from the detail query) into an editable row.
export function itemRowFromDetail(item: {
  id: number;
  name: string;
  categoryId: number;
  quantity: number;
  unitPrice: number;
  warranty: number | null;
}): ItemRow {
  return {
    uid: nextUid(),
    id: String(item.id),
    name: item.name,
    categoryId: String(item.categoryId),
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    warranty: item.warranty != null ? String(item.warranty) : "",
  };
}

export function emptyRow(defaultCategoryId: string): ItemRow {
  return {uid: nextUid(), id: "", name: "", categoryId: defaultCategoryId, quantity: "1", unitPrice: "", warranty: ""};
}

export function lineTotal(row: ItemRow): number {
  const total = Number(row.quantity) * Number(row.unitPrice);
  return Number.isFinite(total) ? total : 0;
}

export function grandTotalOf(rows: ItemRow[]): number {
  return rows.reduce((sum, row) => sum + lineTotal(row), 0);
}

type BillItemsEditorProps = {
  rows: ItemRow[];
  categories: FilterOption[];
  onChange: (rows: ItemRow[]) => void;
};

// Presentational item-rows editor shared by the Bill create + edit forms. The parent owns the
// `rows` state (so it can decide layout and whether to show a manual Amount fallback when there
// are no items); this renders the section header, the add button, the rows, and the empty hint.
export default function BillItemsEditor({rows, categories, onChange}: BillItemsEditorProps) {
  const defaultCategoryId = categories[0] ? String(categories[0].id) : "";

  function updateRow(uid: string, patch: Partial<ItemRow>) {
    onChange(rows.map((row) => (row.uid === uid ? {...row, ...patch} : row)));
  }

  function addRow() {
    onChange([...rows, emptyRow(defaultCategoryId)]);
  }

  function removeRow(uid: string) {
    onChange(rows.filter((row) => row.uid !== uid));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className={labelClass}>Items ({rows.length})</p>
        <Button type="button" size="sm" variant="tertiary" onPress={addRow}>
          <LuPlus className="size-4"/>
          Add item
        </Button>
      </div>

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <ItemRowFields
              key={row.uid}
              row={row}
              categories={categories}
              onChange={(patch) => updateRow(row.uid, patch)}
              onRemove={() => removeRow(row.uid)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No items — add one, or set the amount above.</p>
      )}
    </div>
  );
}

function ItemRowFields({
  row,
  categories,
  onChange,
  onRemove,
}: {
  row: ItemRow;
  categories: FilterOption[];
  onChange: (patch: Partial<ItemRow>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="border-default bg-surface-secondary flex flex-col gap-3 rounded-[var(--radius)] border px-3.5 py-3">
      {/* Row-scoped hidden id + the getAll()-aligned repeated field names the action parses. */}
      <input type="hidden" name="itemId" value={row.id}/>
      <input type="hidden" name="itemCategoryId" value={row.categoryId}/>

      <div className="flex items-center gap-2">
        <TextField
          name="itemName"
          value={row.name}
          onChange={(name) => onChange({name})}
          isRequired
          aria-label="Item name"
          className="flex-1"
        >
          <Input placeholder="Item name"/>
        </TextField>
        <Button
          type="button"
          size="sm"
          variant="tertiary"
          isIconOnly
          aria-label="Remove item"
          onPress={onRemove}
        >
          <LuTrash2 className="size-4"/>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
        <RowSelect
          label="Category"
          value={row.categoryId}
          options={categories}
          onChange={(categoryId) => onChange({categoryId})}
        />
        <RowNumber label="Qty" value={row.quantity} onChange={(quantity) => onChange({quantity})}/>
        <RowNumber label="Unit €" value={row.unitPrice} onChange={(unitPrice) => onChange({unitPrice})}/>
        <RowNumber
          label="Warranty"
          value={row.warranty}
          onChange={(warranty) => onChange({warranty})}
          optional
        />
      </div>

      <div className="flex justify-end">
        <span className="text-sm font-medium tabular-nums">{formatCurrency(lineTotal(row))}</span>
      </div>
    </li>
  );
}

function RowNumber({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  return (
    <TextField
      name={label === "Qty" ? "itemQuantity" : label === "Unit €" ? "itemUnitPrice" : "itemWarranty"}
      value={value}
      onChange={onChange}
      isRequired={!optional}
      aria-label={label}
      className="flex flex-col gap-1"
    >
      <Label className={labelClass}>{label}</Label>
      <Input type="number" step="any" inputMode="decimal"/>
    </TextField>
  );
}

// Controlled category select, one per item row. Posts its value through the row's hidden
// itemCategoryId input (kept in sync via onChange) so it stays index-aligned with the other
// repeated item fields on submit.
function RowSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || null}
      onChange={(key) => onChange(key != null ? String(key) : "")}
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
