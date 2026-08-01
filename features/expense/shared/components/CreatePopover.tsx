"use client";

import {type ReactNode, type RefObject, useEffect, useState} from "react";
import {Button, Input, Label, Popover, TextField} from "@heroui/react";
import {labelClass} from "@/features/expense/shared/components/FormFields";

// The small "create a new lookup row" form shown when "+ Add new…" is chosen from a select.
// It anchors to `triggerRef` (the wrapped select) via react-aria's standalone popover
// (isOpen/onOpenChange/triggerRef — no DialogTrigger/button needed). It owns the name draft +
// pending/error state; `onSubmit(name)` does the actual create and, on success, the popover
// closes. `extraFields` lets a caller (Supplier) add more inputs above the buttons, gated by
// `canSubmit`.
export default function CreatePopover({
  triggerRef,
  isOpen,
  onOpenChange,
  title,
  extraFields,
  canSubmit = true,
  onSubmit,
}: {
  triggerRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  extraFields?: ReactNode;
  canSubmit?: boolean;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the draft each time the popover opens so a previous entry doesn't linger.
  useEffect(() => {
    if (isOpen) {
      setDraft("");
      setError(null);
    }
  }, [isOpen]);

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
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover.Content isOpen={isOpen} onOpenChange={onOpenChange} triggerRef={triggerRef}>
      <Popover.Dialog className="flex w-64 flex-col gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <TextField value={draft} onChange={setDraft} autoFocus aria-label="Name" className="flex flex-col gap-1">
          <Label className={labelClass}>Name</Label>
          <Input placeholder="Name"/>
        </TextField>
        {extraFields}
        {error ? <p className="text-danger text-sm">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="tertiary" isDisabled={pending} onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="primary" isDisabled={pending || !canSubmit} onPress={handleSubmit}>
            {pending ? "Saving…" : "Add"}
          </Button>
        </div>
      </Popover.Dialog>
    </Popover.Content>
  );
}

// Sentinel option id for the "+ Add new…" row appended to a creatable select's list.
export const CREATE_OPTION_ID = "__create__";
