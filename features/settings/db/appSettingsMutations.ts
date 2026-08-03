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
