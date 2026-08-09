"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Input, Label, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuX} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {CategoryRow, SupplierRow} from "@/features/settings/db/referenceData";
import {SectionCard} from "@/features/settings/components/SectionCard";
import {DeleteButton, PlainSelect, RowShell, UsageNote} from "@/features/settings/components/reference/rowParts";
import {useSettingsMutations} from "@/features/settings/components/reference/useSettingsMutations";
import {createSupplier, deleteSupplier, updateSupplier} from "@/features/settings/db/referenceDataMutations";

// Suppliers (name + category). Every supplier needs a category, so the add form is inert until at
// least one supplier category exists.
export default function SupplierSection({id, suppliers, categories}: {
  id?: string;
  suppliers: SupplierRow[];
  categories: CategoryRow[];
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useSettingsMutations();
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
      id={id}
      title={t("suppliers")}
      count={suppliers.length}
      description={
        categories.length === 0 ? t("addSupplierCategoryFirst") : undefined
      }
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newSupplierName")}
                   className="flex min-w-0 flex-1 basis-full flex-col gap-1 sm:min-w-40 sm:basis-auto">
          <Label className={labelClass}>{tFields("name")}</Label>
          <Input placeholder={t("supplierNamePlaceholder")}/>
        </TextField>
        <div className="min-w-0 flex-1 sm:min-w-40">
          <PlainSelect label={tFields("category")} value={newCategoryId} options={categoryOptions}
                       onChange={setNewCategoryId}/>
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
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")}
                             className="flex min-w-0 flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <div className="w-40">
                    <PlainSelect label={tFields("category")} value={editCategoryId} options={categoryOptions}
                                 onChange={setEditCategoryId}/>
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
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")}
                          onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  {/* Name over its metadata on phones — side by side there leaves the name a few
                      characters and pushes the row under the action buttons. */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="min-w-24 flex-1 truncate text-sm">{row.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted">{row.categoryName}</span>
                      <UsageNote count={row.usage}/>
                    </span>
                  </div>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly
                          aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy}
                                onConfirm={() => run(() => deleteSupplier(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
