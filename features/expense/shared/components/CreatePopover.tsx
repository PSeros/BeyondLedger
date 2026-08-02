"use client";

import {type ReactNode, useState} from "react";
import {Button, Input, Label, Popover, TextField} from "@heroui/react";
import {LuPlus} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";

// The "+" affordance beside a creatable select. It's a proper HeroUI Popover (DialogTrigger +
// Button trigger — the same working pattern as BillFilterButton), controlled so it can close
// itself after a successful create. It owns the name draft + pending/error state; `onSubmit(name)`
// does the create and, on success, the popover closes. `extraFields` lets a caller (Supplier) add
// more inputs above the buttons, gated by `canSubmit`.
export default function CreatePopover({
  title,
  triggerLabel,
  triggerClassName,
  extraFields,
  canSubmit = true,
  onSubmit,
}: {
  title: string;
  triggerLabel: string;
  triggerClassName?: string;
  extraFields?: ReactNode;
  canSubmit?: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setDraft("");
      setError(null);
    }
  }

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setError("Name is required.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover isOpen={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        size="sm"
        variant="tertiary"
        isIconOnly
        aria-label={triggerLabel}
        className={triggerClassName}
      >
        <LuPlus className="size-4"/>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="flex w-64 flex-col gap-3">
          <p className="text-sm font-semibold">{title}</p>
          <TextField value={draft} onChange={setDraft} autoFocus aria-label="Name" className="flex flex-col gap-1">
            <Label className={labelClass}>Name</Label>
            <Input placeholder="Name"/>
          </TextField>
          {extraFields}
          {error ? <p className="text-danger text-sm">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="tertiary" isDisabled={pending} onPress={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="primary" isDisabled={pending || !canSubmit} onPress={handleSubmit}>
              {pending ? "Saving…" : "Add"}
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
