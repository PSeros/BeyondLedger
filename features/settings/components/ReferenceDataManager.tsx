"use client";

import {type Key, type ReactNode, useState} from "react";
import {useRouter} from "next/navigation";
import {Button, Input, Label, ListBox, Popover, Select, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuTrash2, LuX} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {CategoryRow, FrequencyRow, ReferenceData, SupplierRow} from "@/features/settings/db/referenceData";
import {
  createContractCategory,
  createFrequency,
  createItemCategory,
  createSupplier,
  createSupplierCategory,
  deleteContractCategory,
  deleteFrequency,
  deleteItemCategory,
  deleteSupplier,
  deleteSupplierCategory,
  renameContractCategory,
  renameItemCategory,
  renameSupplierCategory,
  updateFrequency,
  updateSupplier,
} from "@/features/settings/db/referenceDataMutations";

// Runs a reference-data mutation, then refreshes the Server Component so the lists + usage
// counts (and every Add-form dropdown, via revalidatePath) reflect the change. Surfaces the
// action's thrown message (duplicate name, in-use delete, …) to the caller.
function useMutations() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>, onDone?: () => void): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone?.();
      router.refresh();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return {run, busy, error, setError};
}

export default function ReferenceDataManager({data}: {data: ReferenceData}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Reference data</h1>
        <p className="mt-1 text-sm text-muted">
          The suppliers, categories, and billing frequencies your expenses can reference. Add or tidy
          these here, or create them on the fly from the Add form. A row used by an existing expense
          can&apos;t be deleted.
        </p>
      </div>

      <SupplierSection suppliers={data.suppliers} categories={data.supplierCategories}/>

      <div className="grid gap-6 lg:grid-cols-3">
        <NameSection
          title="Supplier categories"
          rows={data.supplierCategories}
          usageNoun="supplier"
          create={createSupplierCategory}
          rename={renameSupplierCategory}
          remove={deleteSupplierCategory}
        />
        <NameSection
          title="Item categories"
          rows={data.itemCategories}
          usageNoun="item"
          create={createItemCategory}
          rename={renameItemCategory}
          remove={deleteItemCategory}
        />
        <NameSection
          title="Contract categories"
          rows={data.contractCategories}
          usageNoun="contract"
          create={createContractCategory}
          rename={renameContractCategory}
          remove={deleteContractCategory}
        />
      </div>

      <FrequencySection frequencies={data.frequencies}/>
    </div>
  );
}

// --- shared building blocks -------------------------------------------------

function SectionCard({title, description, children}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-default bg-surface flex flex-col gap-3 rounded-[var(--radius)] border p-5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function UsageNote({count, noun}: {count: number; noun: string}) {
  if (count === 0) {
    return <span className="text-xs text-muted">unused</span>;
  }
  return (
    <span className="text-xs text-muted">
      {count} {noun}
      {count === 1 ? "" : "s"}
    </span>
  );
}

function RowShell({children}: {children: ReactNode}) {
  return (
    <li className="border-default flex items-center gap-2 border-b py-2 last:border-b-0">{children}</li>
  );
}

// Trash button that asks for confirmation in a small popover. Disabled (with a reason) when the
// row is still referenced — deleting would fail the FK constraint, which the action also guards.
function DeleteButton({label, usage, disabled, onConfirm}: {
  label: string;
  usage: number;
  disabled: boolean;
  onConfirm: () => void;
}) {
  if (usage > 0) {
    return (
      <span title="In use — can't delete" className="inline-flex">
        <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled aria-label={`Delete ${label} (in use)`}>
          <LuTrash2 className="size-4"/>
        </Button>
      </span>
    );
  }

  return (
    <Popover>
      <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled={disabled} aria-label={`Delete ${label}`}>
        <LuTrash2 className="size-4"/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-56 flex-col gap-3">
          <p className="text-sm">
            Delete <span className="font-medium">{label}</span>?
          </p>
          <Button type="button" size="sm" variant="danger" onPress={onConfirm}>
            Delete
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

// A plain (non-creatable) controlled select, used inside the supplier create/edit forms.
function PlainSelect({label, value, options, onChange}: {
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

// --- name-only category sections (Supplier/Item/Contract categories) --------

function NameSection({title, rows, usageNoun, create, rename, remove}: {
  title: string;
  rows: CategoryRow[];
  usageNoun: string;
  create: (name: string) => Promise<FilterOption>;
  rename: (id: number, name: string) => Promise<FilterOption>;
  remove: (id: number) => Promise<void>;
}) {
  const {run, busy, error, setError} = useMutations();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(row: CategoryRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
  }

  return (
    <SectionCard title={title} description={`${rows.length} total`}>
      <div className="flex items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={`New ${title}`} className="flex flex-1 flex-col gap-1">
          <Input placeholder="Add new…"/>
        </TextField>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || newName.trim() === ""}
          onPress={() => run(() => create(newName), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          Add
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label="Name" className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label="Save"
                    isDisabled={busy || editName.trim() === ""}
                    onPress={() => run(() => rename(row.id, editName), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label="Cancel" onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <UsageNote count={row.usage} noun={usageNoun}/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={`Edit ${row.name}`} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy} onConfirm={() => run(() => remove(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// --- suppliers (name + category) --------------------------------------------

function SupplierSection({suppliers, categories}: {suppliers: SupplierRow[]; categories: CategoryRow[]}) {
  const {run, busy, error, setError} = useMutations();
  const categoryOptions: FilterOption[] = categories.map((c) => ({id: c.id, name: c.name}));
  const firstCategoryId = categories[0] ? String(categories[0].id) : "";

  const [newName, setNewName] = useState("");
  const [newCategoryId, setNewCategoryId] = useState(firstCategoryId);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  function startEdit(row: SupplierRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
    setEditCategoryId(String(row.categoryId));
  }

  const canAddSupplier = newName.trim() !== "" && newCategoryId !== "";

  return (
    <SectionCard
      title="Suppliers"
      description={
        categories.length === 0
          ? "Add a supplier category first — every supplier needs one."
          : `${suppliers.length} total`
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label="New supplier name" className="flex min-w-40 flex-1 flex-col gap-1">
          <Label className={labelClass}>Name</Label>
          <Input placeholder="Supplier name"/>
        </TextField>
        <div className="min-w-40 flex-1">
          <PlainSelect label="Category" value={newCategoryId} options={categoryOptions} onChange={setNewCategoryId}/>
        </div>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || !canAddSupplier}
          onPress={() => run(() => createSupplier(newName, Number(newCategoryId)), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          Add
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {suppliers.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col">
          {suppliers.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label="Name" className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <div className="w-40">
                    <PlainSelect label="Category" value={editCategoryId} options={categoryOptions} onChange={setEditCategoryId}/>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label="Save"
                    isDisabled={busy || editName.trim() === "" || editCategoryId === ""}
                    onPress={() => run(() => updateSupplier(row.id, editName, Number(editCategoryId)), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label="Cancel" onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-xs text-muted">{row.categoryName}</span>
                  <UsageNote count={row.usage} noun="expense"/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={`Edit ${row.name}`} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy} onConfirm={() => run(() => deleteSupplier(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

// --- frequencies (name + value + isRecurring) -------------------------------

function FrequencySection({frequencies}: {frequencies: FrequencyRow[]}) {
  const {run, busy, error, setError} = useMutations();
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newRecurring, setNewRecurring] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editRecurring, setEditRecurring] = useState(true);

  function startEdit(row: FrequencyRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
    setEditValue(String(row.value));
    setEditRecurring(row.isRecurring);
  }

  const canAdd = newName.trim() !== "" && Number.isInteger(Number(newValue)) && Number(newValue) >= 0;

  return (
    <SectionCard
      title="Billing frequencies"
      description="How often a fixed expense bills. Value is billings per year (0 = one-time)."
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label="New frequency name" className="flex min-w-40 flex-1 flex-col gap-1">
          <Label className={labelClass}>Name</Label>
          <Input placeholder="e.g. Monthly"/>
        </TextField>
        <TextField value={newValue} onChange={setNewValue} aria-label="Billings per year" className="flex w-28 flex-col gap-1">
          <Label className={labelClass}>Per year</Label>
          <Input type="number" step="1" inputMode="numeric" placeholder="12"/>
        </TextField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)}/>
          Recurring
        </label>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || !canAdd}
          onPress={() => run(() => createFrequency(newName, Number(newValue), newRecurring), () => {
            setNewName("");
            setNewValue("");
          })}
        >
          <LuPlus className="size-4"/>
          Add
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {frequencies.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col">
          {frequencies.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label="Name" className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <TextField value={editValue} onChange={setEditValue} aria-label="Billings per year" className="flex w-24 flex-col gap-1">
                    <Input type="number" step="1" inputMode="numeric"/>
                  </TextField>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)}/>
                    Recurring
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label="Save"
                    isDisabled={busy || editName.trim() === "" || !Number.isInteger(Number(editValue)) || Number(editValue) < 0}
                    onPress={() => run(() => updateFrequency(row.id, editName, Number(editValue), editRecurring), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label="Cancel" onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-xs text-muted">
                    {row.value}/yr{row.isRecurring ? "" : " · one-time"}
                  </span>
                  <UsageNote count={row.usage} noun="use"/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={`Edit ${row.name}`} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy} onConfirm={() => run(() => deleteFrequency(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
