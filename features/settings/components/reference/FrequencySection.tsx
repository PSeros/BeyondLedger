"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {Button, Input, Label, TextField} from "@heroui/react";
import {LuCheck, LuPencil, LuPlus, LuX} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {FrequencyRow} from "@/features/settings/db/referenceData";
import {SectionCard} from "@/features/settings/components/SectionCard";
import {DeleteButton, RowShell, UsageNote} from "@/features/settings/components/reference/rowParts";
import {useSettingsMutations} from "@/features/settings/components/reference/useSettingsMutations";
import {createFrequency, deleteFrequency, updateFrequency} from "@/features/settings/db/referenceDataMutations";

// Billing frequencies (name + billings per year + isRecurring). Shared by fixed expenses and income.
export default function FrequencySection({id, frequencies}: {id?: string; frequencies: FrequencyRow[]}) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tFields = useTranslations("fields");
  const {run, busy, error, setError} = useSettingsMutations();
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
      id={id}
      title={t("billingFrequencies")}
      count={frequencies.length}
      description={t("frequencyDescription")}
    >
      <div className="flex flex-wrap items-end gap-2">
        <TextField value={newName} onChange={setNewName} aria-label={t("newFrequencyName")}
                   className="flex min-w-0 flex-1 basis-full flex-col gap-1 sm:min-w-40 sm:basis-auto">
          <Label className={labelClass}>{tFields("name")}</Label>
          <Input placeholder={t("frequencyNamePlaceholder")}/>
        </TextField>
        <TextField value={newValue} onChange={setNewValue} aria-label={tFields("billingsPerYear")}
                   className="flex w-28 flex-col gap-1">
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
                  <TextField value={editName} onChange={setEditName} aria-label={tFields("name")}
                             className="flex min-w-0 flex-1 flex-col gap-1">
                    <Input autoFocus/>
                  </TextField>
                  <TextField value={editValue} onChange={setEditValue} aria-label={tFields("billingsPerYear")}
                             className="flex w-24 flex-col gap-1">
                    <Input type="number" step="1" inputMode="numeric"/>
                  </TextField>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={editRecurring}
                           onChange={(e) => setEditRecurring(e.target.checked)}/>
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
                  <Button type="button" size="sm" variant="tertiary" isIconOnly aria-label={tCommon("cancel")}
                          onPress={() => setEditingId(null)}>
                    <LuX className="size-4"/>
                  </Button>
                </>
              ) : (
                <>
                  {/* min-w keeps the name readable: `truncate` sets its automatic minimum size to
                      0, so without a floor it yields all its width to the meta columns. Metadata
                      drops to its own line on phones (see SupplierSection). */}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                    <span className="min-w-24 flex-1 truncate text-sm">{row.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-muted">
                        {t("perYearSuffix", {value: row.value})}{row.isRecurring ? "" : ` · ${t("oneTime")}`}
                      </span>
                      <UsageNote count={row.usage}/>
                    </span>
                  </div>
                  <Button type="button" size="sm" variant="tertiary" isIconOnly
                          aria-label={t("editAria", {label: row.name})} onPress={() => startEdit(row)}>
                    <LuPencil className="size-4"/>
                  </Button>
                  <DeleteButton label={row.name} usage={row.usage} disabled={busy}
                                onConfirm={() => run(() => deleteFrequency(row.id))}/>
                </>
              )}
            </RowShell>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
