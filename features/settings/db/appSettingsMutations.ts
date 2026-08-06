"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {APP_SETTINGS_ID, DEFAULT_LOCALE, LOCALES, type Locale} from "@/features/settings/db/appSettings";

// Write side for app-wide preferences (Phase i18n). Mirrors aiSettingsMutations conventions.
// Changing the locale re-renders the entire tree (translated strings + <html lang> +
// currency/date formatting), so revalidate the root layout, not just /settings.

export async function updateLocale(locale: string): Promise<void> {
  const next: Locale = (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;

  await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID, locale: next},
    update: {locale: next},
  });

  revalidatePath("/", "layout");
}

// Sets the active account (Phase 14 workspace switcher). null = "All accounts". Like the locale, the
// active account changes server-rendered output across the whole app (every list/chart/budget is
// filtered by it), so revalidate the root layout — this also re-runs the client tables' server
// pages so they refetch with the new account.
export async function setActiveWorkspace(id: number | null): Promise<void> {
  const next = id != null && Number.isInteger(id) && id > 0 ? id : null;

  await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID, activeWorkspaceId: next},
    update: {activeWorkspaceId: next},
  });

  revalidatePath("/", "layout");
}
