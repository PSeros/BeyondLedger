import {client} from "@/lib/prisma";

// Read side for app-wide preferences. Config is a singleton row (always id: 1, created on first
// read via upsert), mirroring aiSettings.ts. Currently holds the UI/formatting locale.
//
// SERVER-ONLY (imports the Prisma client). Consumed by i18n/request.ts, the root layout
// (<html lang>) and the /settings Language section.

export const APP_SETTINGS_ID = 1;

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

function normalizeLocale(value: string): Locale {
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : DEFAULT_LOCALE;
}

export type AppSettings = {
  locale: Locale;
  // The account (Workspace) the app is filtered to (Phase 14). null = "All accounts".
  activeWorkspaceId: number | null;
};

// Self-creating singleton read.
export async function getAppSettings(): Promise<AppSettings> {
  const row = await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID},
    update: {},
    select: {locale: true, activeWorkspaceId: true},
  });
  return {locale: normalizeLocale(row.locale), activeWorkspaceId: row.activeWorkspaceId};
}

// Convenience: just the active locale.
export async function getLocale(): Promise<Locale> {
  const {locale} = await getAppSettings();
  return locale;
}

// Convenience: the active account id (null = "All accounts").
export async function getActiveWorkspaceId(): Promise<number | null> {
  const {activeWorkspaceId} = await getAppSettings();
  return activeWorkspaceId;
}
