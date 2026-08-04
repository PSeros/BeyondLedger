"use client";

import {type Key, type ReactNode, useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, ListBox, Popover, Select, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuTrash2, LuX} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {CategoryRow, FrequencyRow, ReferenceData, SupplierRow, TagRow} from "@/features/settings/db/referenceData";
import type {AiSettingsForm} from "@/features/settings/db/aiSettings";
import AiSettingsSection from "@/features/settings/components/AiSettingsSection";
import LocaleSettingsSection from "@/features/settings/components/LocaleSettingsSection";
import {SectionCard} from "@/features/settings/components/SectionCard";
import TagChip from "@/components/TagChip";
import {DEFAULT_TAG_COLOR, TAG_COLORS} from "@/features/tags/colors";
import {
  createContractCategory,
  createFrequency,
  createIncomeCategory,
  createIncomeSource,
  createItemCategory,
  createSupplier,
  createSupplierCategory,
  createTag,
  deleteContractCategory,
  deleteFrequency,
  deleteIncomeCategory,
  deleteIncomeSource,
  deleteItemCategory,
  deleteSupplier,
  deleteSupplierCategory,
  deleteTag,
  renameContractCategory,
  renameIncomeCategory,
  renameIncomeSource,
  renameItemCategory,
  renameSupplierCategory,
  renameTag,
  setTagColor,
  updateFrequency,
  updateSupplier,
} from "@/features/settings/db/referenceDataMutations";

// Runs a reference-data mutation, then refreshes the Server Component so the lists + usage
// counts (and every Add-form dropdown, via revalidatePath) reflect the change. Surfaces the
// action's thrown message (duplicate name, in-use delete, …) to the caller.
function useMutations() {
  const router = useRouter();
  const t = useTranslations("settings");
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
      setError(mutationError instanceof Error ? mutationError.message : t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return {run, busy, error, setError};
}

export default function ReferenceDataManager({data, aiSettings, locale}: {data: ReferenceData; aiSettings: AiSettingsForm; locale: string}) {
  const t = useTranslations("settings");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-separator pb-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      <div className="min-h-0 flex-1 space-y-8 overflow-y-auto py-6 [scrollbar-gutter:stable]">
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("languageHeading")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t("languageDescription")}</p>
          </div>
          <div className="max-w-2xl">
            <LocaleSettingsSection locale={locale}/>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("aiHeading")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {t("aiHeadingDescription")}
            </p>
          </div>
          <div className="max-w-2xl">
            <AiSettingsSection settings={aiSettings}/>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold">{t("refDataHeading")}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {t("refDataDescription")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="md:col-span-2">
              <SupplierSection suppliers={data.suppliers} categories={data.supplierCategories}/>
            </div>
            <FrequencySection frequencies={data.frequencies}/>
            <NameSection
              title={t("supplierCategories")}
              rows={data.supplierCategories}
              create={createSupplierCategory}
              rename={renameSupplierCategory}
              remove={deleteSupplierCategory}
            />
            <NameSection
              title={t("itemCategories")}
              rows={data.itemCategories}
              create={createItemCategory}
              rename={renameItemCategory}
              remove={deleteItemCategory}
            />
            <NameSection
              title={t("contractCategories")}
              rows={data.contractCategories}
              create={createContractCategory}
              rename={renameContractCategory}
              remove={deleteContractCategory}
            />
            <NameSection
              title={t("incomeSources")}
              rows={data.incomeSources}
              create={createIncomeSource}
              rename={renameIncomeSource}
              remove={deleteIncomeSource}
            />
            <NameSection
              title={t("incomeCategories")}
              rows={data.incomeCategories}
              create={createIncomeCategory}
              rename={renameIncomeCategory}
              remove={deleteIncomeCategory}
            />
            <div className="md:col-span-2 xl:col-span-3">
              <TagSection tags={data.tags}/>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// --- shared building blocks -------------------------------------------------

function UsageNote({count}: {count: number}) {
  const t = useTranslations("settings");
  if (count === 0) {
    return <span className="text-xs text-muted">{t("unused")}</span>;
  }
  return <span className="text-xs text-muted">{t("usageCount", {count})}</span>;
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
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  if (usage > 0) {
    return (
      <span title={t("inUseCantDelete")} className="inline-flex">
        <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled aria-label={t("deleteInUseAria", {label})}>
          <LuTrash2 className="size-4"/>
        </Button>
      </span>
    );
  }

  return (
    <Popover>
      <Button type="button" size="sm" variant="tertiary" isIconOnly isDisabled={disabled} aria-label={t("deleteAria", {label})}>
        <LuTrash2 className="size-4"/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-56 flex-col gap-3">
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

function NameSection({title, rows, create, rename, remove}: {
  title: string;
  rows: CategoryRow[];
  create: (name: string) => Promise<FilterOption>;
  rename: (id: number, name: string) => Promise<FilterOption>;
  remove: (id: number) => Promise<void>;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
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
    <SectionCard title={title} count={rows.length}>
      <div className="flex items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newAria", {title})} className="flex flex-1 flex-col gap-1">
          <Input placeholder={t("addNew")}/>
        </TextField>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || newName.trim() === ""}
          onPress={() => run(() => create(newName), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          {tCommon("add")}
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t("noneYet")}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")} className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label={tCommon("save")}
                    isDisabled={busy || editName.trim() === ""}
                    onPress={() => run(() => rename(row.id, editName), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")} onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <UsageNote count={row.usage}/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
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
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
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
      title={t("suppliers")}
      count={suppliers.length}
      description={
        categories.length === 0 ? t("addSupplierCategoryFirst") : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newSupplierName")} className="flex min-w-40 flex-1 flex-col gap-1">
          <Label className={labelClass}>{tFields("name")}</Label>
          <Input placeholder={t("supplierNamePlaceholder")}/>
        </TextField>
        <div className="min-w-40 flex-1">
          <PlainSelect label={tFields("category")} value={newCategoryId} options={categoryOptions} onChange={setNewCategoryId}/>
        </div>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || !canAddSupplier}
          onPress={() => run(() => createSupplier(newName, Number(newCategoryId)), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          {tCommon("add")}
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {suppliers.length === 0 ? (
        <p className="text-sm text-muted">{t("noneYet")}</p>
      ) : (
        <ul className="flex flex-col">
          {suppliers.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")} className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <div className="w-40">
                    <PlainSelect label={tFields("category")} value={editCategoryId} options={categoryOptions} onChange={setEditCategoryId}/>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label={tCommon("save")}
                    isDisabled={busy || editName.trim() === "" || editCategoryId === ""}
                    onPress={() => run(() => updateSupplier(row.id, editName, Number(editCategoryId)), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")} onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-xs text-muted">{row.categoryName}</span>
                  <UsageNote count={row.usage}/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
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
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
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
      title={t("billingFrequencies")}
      count={frequencies.length}
      description={t("frequencyDescription")}
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newFrequencyName")} className="flex min-w-40 flex-1 flex-col gap-1">
          <Label className={labelClass}>{tFields("name")}</Label>
          <Input placeholder={t("frequencyNamePlaceholder")}/>
        </TextField>
        <TextField value={newValue} onChange={setNewValue} aria-label={tFields("billingsPerYear")} className="flex w-28 flex-col gap-1">
          <Label className={labelClass}>{t("perYear")}</Label>
          <Input type="number" step="1" inputMode="numeric" placeholder="12"/>
        </TextField>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)}/>
          {t("recurring")}
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
          {tCommon("add")}
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {frequencies.length === 0 ? (
        <p className="text-sm text-muted">{t("noneYet")}</p>
      ) : (
        <ul className="flex flex-col">
          {frequencies.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")} className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <TextField value={editValue} onChange={setEditValue} aria-label={tFields("billingsPerYear")} className="flex w-24 flex-col gap-1">
                    <Input type="number" step="1" inputMode="numeric"/>
                  </TextField>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={editRecurring} onChange={(e) => setEditRecurring(e.target.checked)}/>
                    {t("recurring")}
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label={tCommon("save")}
                    isDisabled={busy || editName.trim() === "" || !Number.isInteger(Number(editValue)) || Number(editValue) < 0}
                    onPress={() => run(() => updateFrequency(row.id, editName, Number(editValue), editRecurring), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")} onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <span className="text-xs text-muted">
                    {t("perYearSuffix", {value: row.value})}{row.isRecurring ? "" : ` · ${t("oneTime")}`}
                  </span>
                  <UsageNote count={row.usage}/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
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

// --- tags (name + color) ----------------------------------------------------

// A swatch button that opens a small palette Popover; picking a color fires onChange and closes.
// Used both to choose a new tag's color and to recolor an existing one.
function ColorPicker({value, onChange, ariaLabel, disabled}: {
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
              style={{backgroundColor: color, outline: color === value ? "2px solid var(--foreground)" : undefined, outlineOffset: "2px"}}
            />
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function TagSection({tags}: {tags: TagRow[]}) {
  const t = useTranslations("settings");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useMutations();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(row: TagRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
  }

  return (
    <SectionCard title={tTags("title")} count={tags.length} description={tTags("manageDescription")}>
      <div className="flex items-end gap-2">
        <ColorPicker value={newColor} onChange={setNewColor} ariaLabel={tTags("pickColor")}/>
        <TextField value={newName} onChange={setNewName} aria-label={tTags("newAria")} className="flex flex-1 flex-col gap-1">
          <Input placeholder={tTags("addNew")}/>
        </TextField>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || newName.trim() === ""}
          onPress={() => run(() => createTag(newName, newColor), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          {tCommon("add")}
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {tags.length === 0 ? (
        <p className="text-sm text-muted">{tTags("noneYet")}</p>
      ) : (
        <ul className="flex flex-col">
          {tags.map((row) => (
            <RowShell key={row.id}>
              {editingId === row.id ? (
                <>
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")} className="flex flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <Button
                    type="button"
                    size="sm"
                    variant="tertiary"
                    isIconOnly
                    aria-label={tCommon("save")}
                    isDisabled={busy || editName.trim() === ""}
                    onPress={() => run(() => renameTag(row.id, editName), () => setEditingId(null))}
                  >
                    <LuCheck className="size-4"/>
                  </Button>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")} onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1">
                    <TagChip name={row.name} color={row.color}/>
                  </span>
                  <UsageNote count={row.usage}/>
                  <ColorPicker
                    value={row.color}
                    onChange={(color) => run(() => setTagColor(row.id, color))}
                    ariaLabel={tTags("recolorAria", {label: row.name})}
                    disabled={busy}
                  />
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy} onConfirm={() => run(() => deleteTag(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
