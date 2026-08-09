"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Input, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuX} from "react-icons/lu";
import type {FilterOption} from "@/features/expense/shared/db/expenseFormOptions";
import type {CategoryRow} from "@/features/settings/db/referenceData";
import {SectionCard} from "@/features/settings/components/SectionCard";
import {DeleteButton, RowShell, UsageNote} from "@/features/settings/components/reference/rowParts";
import {useSettingsMutations} from "@/features/settings/components/reference/useSettingsMutations";

// Generic name-only CRUD list. The five category/source lists differ only in their title and the
// three actions they're wired to — see CategoryLists.
export default function NameSection({id, title, rows, create, rename, remove}: {
  id?: string;
  title: string;
  rows: CategoryRow[];
  create: (name: string) => Promise<FilterOption>;
  rename: (id: number, name: string) => Promise<FilterOption>;
  remove: (id: number) => Promise<void>;
}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useSettingsMutations();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(row: CategoryRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
  }

  return (
    <SectionCard id={id} title={title} count={rows.length}>
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newAria", {title})}
                   className="flex min-w-0 flex-1 flex-col gap-1">
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
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")}
                             className="flex min-w-0 flex-1 flex-col gap-1">
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
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")}
                          onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 truncate text-sm">{row.name}</span>
                  <UsageNote count={row.usage}/>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly
                          aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy}
                                onConfirm={() => run(() => remove(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
