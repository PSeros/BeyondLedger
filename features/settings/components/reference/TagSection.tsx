"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Input, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuX} from "react-icons/lu";
import TagChip from "@/components/TagChip";
import {DEFAULT_TAG_COLOR} from "@/features/tags/colors";
import type {TagRow} from "@/features/settings/db/referenceData";
import {SectionCard} from "@/features/settings/components/SectionCard";
import {ColorPicker, DeleteButton, RowShell, UsageNote} from "@/features/settings/components/reference/rowParts";
import {useSettingsMutations} from "@/features/settings/components/reference/useSettingsMutations";
import {createTag, deleteTag, renameTag, setTagColor} from "@/features/settings/db/referenceDataMutations";

// Tags (name + color). Delete is blocked while entries still carry the tag (usage > 0).
export default function TagSection({id, tags}: {id?: string; tags: TagRow[]}) {
  const t = useTranslations("settings");
  const tTags = useTranslations("tags");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useSettingsMutations();
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
    <SectionCard id={id} title={tTags("title")} count={tags.length} description={tTags("manageDescription")}>
      <div className="flex flex-wrap items-end gap-2">
        <ColorPicker value={newColor} onChange={setNewColor} ariaLabel={tTags("pickColor")}/>
        <TextField value={newName} onChange={setNewName} aria-label={tTags("newAria")}
                   className="flex min-w-0 flex-1 flex-col gap-1">
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
                    onPress={() => run(() => renameTag(row.id, editName), () => setEditingId(null))}
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
                    onChange={(color) => run(() => setTagColor(row.id, color))}
                    ariaLabel={tTags("recolorAria", {label: row.name})}
                    disabled={busy}
                  />
                  <Button type="button" size="sm" variant="tertiary" isIconOnly
                          aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy}
                                onConfirm={() => run(() => deleteTag(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
