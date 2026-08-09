"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";

// Runs a reference-data mutation, then refreshes the Server Component so the lists + usage
// counts (and every Add-form dropdown, via revalidatePath) reflect the change. Surfaces the
// action's thrown message (duplicate name, in-use delete, …) to the caller.
export function useSettingsMutations() {
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
