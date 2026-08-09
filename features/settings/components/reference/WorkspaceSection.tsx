"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Input, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuX} from "react-icons/lu";
import TagChip from "@/components/TagChip";
import {DEFAULT_WORKSPACE_COLOR} from "@/features/workspaces/colors";
import type {WorkspaceRow} from "@/features/settings/db/referenceData";
import {SectionCard} from "@/features/settings/components/SectionCard";
import {ColorPicker, DeleteButton, RowShell, UsageNote} from "@/features/settings/components/reference/rowParts";
import {useSettingsMutations} from "@/features/settings/components/reference/useSettingsMutations";
import {
  createWorkspace,
  deleteWorkspace,
  renameWorkspace,
  setWorkspaceColor,
} from "@/features/settings/db/referenceDataMutations";

// Accounts (Workspaces): same shape as TagSection. Delete is blocked while the account still holds
// records (usage > 0).
export default function WorkspaceSection({id, workspaces}: {id?: string; workspaces: WorkspaceRow[]}) {
  const t = useTranslations("settings");
  const tWs = useTranslations("workspaces");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useSettingsMutations();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(DEFAULT_WORKSPACE_COLOR);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  function startEdit(row: WorkspaceRow) {
    setError(null);
    setEditingId(row.id);
    setEditName(row.name);
  }

  return (
    <SectionCard id={id} title={tWs("title")} count={workspaces.length} description={tWs("manageDescription")}>
      <div className="flex flex-wrap items-end gap-2">
        <ColorPicker value={newColor} onChange={setNewColor} ariaLabel={tWs("pickColor")}/>
        <TextField value={newName} onChange={setNewName} aria-label={tWs("newAria")}
                   className="flex min-w-0 flex-1 flex-col gap-1">
          <Input placeholder={tWs("addNew")}/>
        </TextField>
        <Button
          type="button"
          size="sm"
          variant="primary"
          isDisabled={busy || newName.trim() === ""}
          onPress={() => run(() => createWorkspace(newName, newColor), () => setNewName(""))}
        >
          <LuPlus className="size-4"/>
          {tCommon("add")}
        </Button>
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}

      {workspaces.length === 0 ? (
        <p className="text-sm text-muted">{tWs("noneYet")}</p>
      ) : (
        <ul className="flex flex-col">
          {workspaces.map((row) => (
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
                    onPress={() => run(() => renameWorkspace(row.id, editName), () => setEditingId(null))}
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
                  <span className="flex-1">
                    <TagChip name={row.name} color={row.color}/>
                  </span>
                  <UsageNote count={row.usage}/>
                  <ColorPicker
                    value={row.color}
                    onChange={(color) => run(() => setWorkspaceColor(row.id, color))}
                    ariaLabel={tWs("recolorAria", {label: row.name})}
                    disabled={busy}
                  />
                  <Button type="button" size="sm" variant="tertiary" isIconOnly
                          aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy}
                                onConfirm={() => run(() => deleteWorkspace(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
