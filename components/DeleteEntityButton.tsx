"use client";

import {useState} from "react";
import {Button} from "@heroui/react";
import {LuTrash2} from "react-icons/lu";
import {useRouter} from "next/navigation";

type DeleteEntityButtonProps = {
  id: number;
  // A bound server action that deletes the entity by id (deleteIncome / deleteBill / deleteContract).
  action: (id: number) => Promise<void>;
  label: string;
  // Standalone detail pages pass the list path to push to after deleting; the modal omits it and
  // navigates back (which closes the overlay). Two-step inline confirm, not a Popover — a Popover
  // nested inside the detail Modal would be a fragile overlay-in-overlay.
  redirectTo?: string;
};

export default function DeleteEntityButton({id, action, label, redirectTo}: DeleteEntityButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setPending(true);
    setError(null);
    try {
      await action(id);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.back();
      }
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete.");
      setPending(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Button type="button" variant="tertiary" size="sm" onPress={() => setConfirming(true)}>
          <LuTrash2 className="size-4"/>
          Delete
        </Button>
        {error ? <p className="text-danger text-xs">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Delete {label}?</span>
      <Button type="button" variant="danger" size="sm" isDisabled={pending} onPress={onConfirm}>
        {pending ? "Deleting…" : "Yes, delete"}
      </Button>
      <Button type="button" variant="tertiary" size="sm" isDisabled={pending} onPress={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
