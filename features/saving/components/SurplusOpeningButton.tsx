"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, Popover, TextField} from "@heroui/react";
import {LuWallet} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import {setSurplusOpening} from "@/features/saving/db/surplusOpening";

type Account = {id: number; name: string; color: string; openingBalance: number | null};

// The Überschuss starts from what each account held at the start date. One field per account.
export default function SurplusOpeningButton({accounts}: {accounts: Account[]}) {
  const t = useTranslations("saving");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<number, string>>(
    Object.fromEntries(accounts.map((a) => [a.id, a.openingBalance != null ? String(a.openingBalance) : ""])),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = accounts.map((a) => {
    const raw = (values[a.id] ?? "").trim().replace(",", ".");
    return {workspaceId: a.id, amount: raw === "" ? null : Number(raw)};
  });
  const valid = parsed.every((p) => p.amount == null || Number.isFinite(p.amount));

  async function save() {
    setPending(true);
    setError(null);
    try {
      await setSurplusOpening(parsed);
      setOpen(false);
      router.refresh();
    } catch {
      setError(tErrors("couldNotSave"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button size="sm" variant="tertiary">
        <LuWallet className="size-4"/>{t("openingLabel")}
      </Button>
      <Popover.Content placement="bottom end">
        <Popover.Dialog className="flex w-72 flex-col gap-3 p-3">
          <p className="text-xs text-muted">{t("surplusOpeningHint")}</p>
          {accounts.map((a) => (
            <TextField
              key={a.id}
              value={values[a.id] ?? ""}
              onChange={(v) => setValues((prev) => ({...prev, [a.id]: v}))}
              aria-label={a.name}
              className="flex flex-col gap-1"
            >
              <Label className={`${labelClass} flex items-center gap-1.5`}>
                <span className="size-2 rounded-full" style={{background: a.color}}/>{a.name}
              </Label>
              <Input type="number" inputMode="decimal" step="any" placeholder="0"/>
            </TextField>
          ))}
          {error ? <p className="text-danger text-xs">{error}</p> : null}
          <div className="flex justify-end">
            <Button size="sm" variant="primary" isDisabled={pending || !valid} onPress={save}>{tCommon("save")}</Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
