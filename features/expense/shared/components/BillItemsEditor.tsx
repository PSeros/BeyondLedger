"use client";

import {useState} from "react";
import {useFormatter, useTranslations} from "next-intl";
import {Button, Input, Label, TextField} from "@heroui/react";
import {LuPlus, LuTrash2} from "react-icons/lu";
import {FieldErrorMessage, labelClass} from "@/features/expense/shared/components/FormFields";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import TagMultiSelect from "@/features/tags/components/TagMultiSelect";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {TagOption} from "@/features/tags/types";

// One editable line-item row. `uid` is a stable client-only React key (rows are added/removed,
// so a DB id isn't available for new rows); `id` is the DB id (empty for a not-yet-saved row,
// which is every row on the create form). `tagIds` are the row's selected tag ids (strings).
export type ItemRow = {
  uid: string;
  id: string;
  name: string;
  categoryId: string;
  quantity: string;
  unitPrice: string;
  warranty: string;
  tagIds: string[];
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
  tags: {id: number}[];
}): ItemRow {
  return {
    uid: nextUid(),
    id: String(item.id),
    name: item.name,
    categoryId: String(item.categoryId),
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    warranty: item.warranty != null ? String(item.warranty) : "",
    tagIds: item.tags.map((tag) => String(tag.id)),
  };
}

export function emptyRow(defaultCategoryId: string): ItemRow {
  return {uid: nextUid(), id: "", name: "", categoryId: defaultCategoryId, quantity: "1", unitPrice: "", warranty: "", tagIds: []};
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
  tags: TagOption[];
  onChange: (rows: ItemRow[]) => void;
  onCreateCategory?: (name: string) => Promise<FilterOption>;
  onCreateTag?: (name: string) => Promise<TagOption>;
};

// Presentational item-rows editor shared by the Bill create + edit forms. The parent owns the
// `rows` state (and seeds it with one row, since a Bill must always carry at least one item —
// its total is the sum of the lines, and only item-level rows show up in the category breakdown /
// top-k / budget matching); this renders the section header, the add button and the rows. The
// last remaining row has no remove button, so the form can't be emptied out.
// Each row carries its own tag picker so a cross-cutting tag can land on a single line item.
export default function BillItemsEditor({rows, categories, tags, onChange, onCreateCategory, onCreateTag}: BillItemsEditorProps) {
  const t = useTranslations("forms");
  // Local copy of the category list so an inline-created category appears in every row's select
  // without a page refresh.
  const [cats, setCats] = useState<FilterOption[]>(categories);
  const defaultCategoryId = cats[0] ? String(cats[0].id) : "";

  function updateRow(uid: string, patch: Partial<ItemRow>) {
    onChange(rows.map((row) => (row.uid === uid ? {...row, ...patch} : row)));
  }

  function addRow() {
    onChange([...rows, emptyRow(defaultCategoryId)]);
  }

  function removeRow(uid: string) {
    onChange(rows.filter((row) => row.uid !== uid));
  }

  const createCategory = onCreateCategory
    ? async (name: string): Promise<FilterOption> => {
      const created = await onCreateCategory(name);
      setCats((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      return created;
    }
    : undefined;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className={labelClass}>{t("items", {count: rows.length})}</p>
        <Button type="button" size="sm" variant="tertiary" onPress={addRow}>
          <LuPlus className="size-4"/>
          {t("addItem")}
        </Button>
      </div>

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <ItemRowFields
              key={row.uid}
              row={row}
              categories={cats}
              tags={tags}
              onCreateCategory={createCategory}
              onCreateTag={onCreateTag}
              onChange={(patch) => updateRow(row.uid, patch)}
              // The last row stays put: a bill without items has an amount nothing can attribute.
              onRemove={rows.length > 1 ? () => removeRow(row.uid) : undefined}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("noItems")}</p>
      )}
    </div>
  );
}

function ItemRowFields({
  row,
  categories,
  tags,
  onCreateCategory,
  onCreateTag,
  onChange,
  onRemove,
}: {
  row: ItemRow;
  categories: FilterOption[];
  tags: TagOption[];
  onCreateCategory?: (name: string) => Promise<FilterOption>;
  onCreateTag?: (name: string) => Promise<TagOption>;
  onChange: (patch: Partial<ItemRow>) => void;
  onRemove?: () => void;
}) {
  const t = useTranslations("forms");
  const tFields = useTranslations("fields");
  const tTags = useTranslations("tags");
  const format = useFormatter();

  return (
    <li className="border-default bg-surface-secondary flex flex-col gap-3 rounded-(--radius) border px-3.5 py-3">
      {/* Row-scoped hidden id + the getAll()-aligned repeated field names the action parses. Tags
          are serialized as one comma-joined input per row (always present, even when empty) so the
          parser's parallel arrays stay index-aligned. */}
      <input type="hidden" name="itemId" value={row.id}/>
      <input type="hidden" name="itemCategoryId" value={row.categoryId}/>
      <input type="hidden" name="itemTagIds" value={row.tagIds.join(",")}/>

      <div className="flex items-center gap-2">
        <TextField
          name="itemName"
          value={row.name}
          onChange={(name) => onChange({name})}
          isRequired
          aria-label={t("itemName")}
          className="flex flex-1 flex-col gap-1"
        >
          <Input placeholder={t("itemName")}/>
          <FieldErrorMessage/>
        </TextField>
        {onRemove ? (
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isIconOnly
            aria-label={t("removeItem")}
            onPress={onRemove}
          >
            <LuTrash2 className="size-4"/>
          </Button>
        ) : null}
      </div>

      {/* Four equal columns on desktop (Category, Qty, Unit, Warranty). On the 2-col mobile
          layout Category spans the full row. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CreatableSelect
          label={tFields("category")}
          value={row.categoryId}
          options={categories}
          onSelect={(categoryId) => onChange({categoryId})}
          onCreate={onCreateCategory}
          createTitle={t("newItemCategory")}
          isRequired
          className="col-span-2 sm:col-span-1"
        />
        <RowNumber
          name="itemQuantity"
          label={tFields("quantity")}
          value={row.quantity}
          onChange={(quantity) => onChange({quantity})}
          signToggle
        />
        <RowNumber
          name="itemUnitPrice"
          label={tFields("unitPrice")}
          value={row.unitPrice}
          onChange={(unitPrice) => onChange({unitPrice})}
          signToggle
        />
        <RowNumber
          name="itemWarranty"
          label={tFields("warranty")}
          value={row.warranty}
          onChange={(warranty) => onChange({warranty})}
          optional
        />
      </div>

      <TagMultiSelect
        label={tTags("label")}
        options={tags}
        defaultValue={row.tagIds}
        onChange={(tagIds) => onChange({tagIds})}
        onCreate={onCreateTag}
        emitHiddenInputs={false}
      />

      <div className="flex justify-end">
        <span className="text-sm font-medium tabular-nums">{format.number(lineTotal(row), "currency")}</span>
      </div>
    </li>
  );
}

// Flips the leading minus of an already-typed value. Blank / non-numeric input is left alone (the
// button is disabled then): a lone "-" is not a valid number, so a controlled type="number" input
// would sanitize it straight back to an empty field and the tap would look like it did nothing.
function toggleSign(value: string): string {
  const trimmed = value.trim();
  if (!Number.isFinite(Number(trimmed)) || trimmed === "") {
    return value;
  }
  return trimmed.startsWith("-") ? trimmed.slice(1) : `-${trimmed}`;
}

function RowNumber({
  name,
  label,
  value,
  onChange,
  optional,
  signToggle,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  // Adds a touch-only ± button (see below). Only for fields that may go negative — a bill line can
  // give money back (Pfand/Leergut, a refund, a returned article).
  signToggle?: boolean;
}) {
  const t = useTranslations("forms");

  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      isRequired={!optional}
      aria-label={label}
      className="flex flex-col gap-1"
    >
      <Label className={labelClass}>{label}</Label>
      {/* The ± button is `sm:hidden` — touch keyboards only. `inputMode` (not `type`) picks the
          Android keyboard, and the "decimal" keypad is defined as digits + the locale's decimal
          separator, so it has no minus key at all; a physical keyboard does, hence desktop keeps
          the plain field. */}
      <div className="flex min-w-0 items-center gap-1">
        {/* min-w-0 so the input yields the button's width instead of widening the grid column —
            an <input> carries a wide intrinsic min-width. */}
        <Input type="number" step="any" inputMode="decimal" className="min-w-0 flex-1"/>
        {signToggle ? (
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            isIconOnly
            className="sm:hidden"
            aria-label={t("toggleSign")}
            isDisabled={value.trim() === ""}
            onPress={() => onChange(toggleSign(value))}
          >
            <span aria-hidden="true" className="text-base leading-none">±</span>
          </Button>
        ) : null}
      </div>
      <FieldErrorMessage/>
    </TextField>
  );
}

