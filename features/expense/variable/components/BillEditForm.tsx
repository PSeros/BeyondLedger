"use client";

import {useMemo, useState} from "react";
import {Button, Input, Label, ListBox, Select, TextArea, TextField} from "@heroui/react";
import {useRouter} from "next/navigation";
import {LuPlus, LuTrash2} from "react-icons/lu";
import {updateBill} from "@/features/expense/variable/db/billMutations";
import type {BillDetailData} from "@/features/expense/variable/db/billDetail";
import type {BillFormOptions} from "@/features/expense/variable/db/billFormOptions";
import type {FilterOption} from "@/features/expense/variable/db/billFilterOptions";

const labelClass = "text-foreground-500 text-xs uppercase tracking-wide";

function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {style: "currency", currency: "EUR"});
}

// One editable line-item row. `uid` is a stable client-only React key (rows are added/removed,
// so a DB id isn't available for new rows); `id` is the DB id (empty for a not-yet-saved row).
type ItemRow = {
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

function toRow(item: BillDetailData["items"][number]): ItemRow {
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

function emptyRow(defaultCategoryId: string): ItemRow {
  return {uid: nextUid(), id: "", name: "", categoryId: defaultCategoryId, quantity: "1", unitPrice: "", warranty: ""};
}

function lineTotal(row: ItemRow): number {
  const total = Number(row.quantity) * Number(row.unitPrice);
  return Number.isFinite(total) ? total : 0;
}

type BillEditFormProps = {
  bill: BillDetailData;
  options: BillFormOptions;
};

export default function BillEditForm({bill, options}: BillEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ItemRow[]>(() => bill.items.map(toRow));

  const defaultCategoryId = options.itemCategories[0] ? String(options.itemCategories[0].id) : "";
  const grandTotal = useMemo(() => rows.reduce((sum, row) => sum + lineTotal(row), 0), [rows]);

  function updateRow(uid: string, patch: Partial<ItemRow>) {
    setRows((current) => current.map((row) => (row.uid === uid ? {...row, ...patch} : row)));
  }

  function addRow() {
    setRows((current) => [...current, emptyRow(defaultCategoryId)]);
  }

  function removeRow(uid: string) {
    setRows((current) => current.filter((row) => row.uid !== uid));
  }

  // Edit mode is entered by pushing ?edit onto history (EditLink / Cancel target). Leaving it
  // must POP that entry with router.back(), not push a fresh detail entry — otherwise the
  // ?edit entry is left dangling forward and the modal's own close (router.back()) lands back
  // on it, reopening edit. refresh() then pulls the revalidated data into the detail view.
  function exitEdit() {
    router.back();
    router.refresh();
  }

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      await updateBill(bill.id, formData);
      exitEdit();
    } catch {
      setError("Could not save — please check the fields and try again.");
      setPending(false);
    }
  }

  const hasItems = rows.length > 0;

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <SelectField label="Supplier" name="supplierId" options={options.suppliers} value={String(bill.supplierId)}/>
        <TextInputField label="Date" name="date" type="date" defaultValue={bill.date.slice(0, 10)} isRequired/>
        <TextInputField label="Document number" name="documentNumber" defaultValue={bill.documentNumber ?? ""}/>
        {/* Amount is auto-summed from the items below when there are any; only a bill left with no
            items keeps a manually-entered amount. */}
        {hasItems ? null : (
          <TextInputField label="Amount (€)" name="amount" type="number" defaultValue={String(bill.amount)} isRequired/>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <p className={labelClass}>Items ({rows.length})</p>
          <Button type="button" size="sm" variant="tertiary" onPress={addRow}>
            <LuPlus className="size-4"/>
            Add item
          </Button>
        </div>

        {hasItems ? (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <ItemRowFields
                key={row.uid}
                row={row}
                categories={options.itemCategories}
                onChange={(patch) => updateRow(row.uid, patch)}
                onRemove={() => removeRow(row.uid)}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No items — add one, or set the amount above.</p>
        )}
      </div>

      <TextField name="notes" defaultValue={bill.notes ?? ""} className="flex flex-col gap-1">
        <Label className={labelClass}>Notes</Label>
        <TextArea/>
      </TextField>

      {hasItems ? (
        <div className="flex items-center justify-between rounded-[var(--radius)] bg-[color-mix(in_oklab,var(--accent)_12%,transparent)] px-4 py-3">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-semibold tabular-nums text-[var(--accent)]">{formatCurrency(grandTotal)}</span>
        </div>
      ) : null}

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="tertiary" isDisabled={pending} onPress={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isDisabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
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
          label="Warranty (mo.)"
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
      selectedKey={value || null}
      onSelectionChange={(key) => onChange(key != null ? String(key) : "")}
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

function TextInputField({
  label,
  name,
  defaultValue,
  type = "text",
  isRequired,
}: {
  label: string;
  name: string;
  defaultValue: string;
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

function SelectField({
  label,
  name,
  options,
  value,
}: {
  label: string;
  name: string;
  options: FilterOption[];
  value: string;
}) {
  return (
    <Select name={name} defaultSelectedKey={value} className="flex flex-col gap-1">
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
