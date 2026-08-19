import {client} from "@/lib/prisma";
import type {Lookback} from "@/features/expense/shared/db/cumulativeChart";

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
  // Dashboard reminder windows (Phase 12), in days. See the AppSettings model comment.
  warrantyWarnDays: number;
  upcomingWindowDays: number;
  // How many preceding periods each granularity's Ø baseline averages over. Drives both the chart
  // Ø lines and the dashboard KPI comparison, so the two always describe the same span.
  lookbackWeeks: number;
  lookbackMonths: number;
  lookbackYears: number;
};

export const DEFAULT_WARRANTY_WARN_DAYS = 60;
export const DEFAULT_UPCOMING_WINDOW_DAYS = 30;

// Self-creating singleton read.
export async function getAppSettings(): Promise<AppSettings> {
  const row = await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID},
    update: {},
    select: {
      locale: true,
      activeWorkspaceId: true,
      warrantyWarnDays: true,
      upcomingWindowDays: true,
      lookbackWeeks: true,
      lookbackMonths: true,
      lookbackYears: true,
    },
  });
  return {
    locale: normalizeLocale(row.locale),
    activeWorkspaceId: row.activeWorkspaceId,
    warrantyWarnDays: row.warrantyWarnDays,
    upcomingWindowDays: row.upcomingWindowDays,
    lookbackWeeks: row.lookbackWeeks,
    lookbackMonths: row.lookbackMonths,
    lookbackYears: row.lookbackYears,
  };
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

// Convenience: the warranty-expiry alert window (days).
export async function getWarrantyWarnDays(): Promise<number> {
  const {warrantyWarnDays} = await getAppSettings();
  return warrantyWarnDays;
}

// Convenience: the dashboard upcoming fixed-expense/income window (days).
export async function getUpcomingWindowDays(): Promise<number> {
  const {upcomingWindowDays} = await getAppSettings();
  return upcomingWindowDays;
}

// Convenience: the per-granularity Ø baseline lookback, shaped for the chart/KPI builders.
export async function getLookback(): Promise<Lookback> {
  const {lookbackWeeks, lookbackMonths, lookbackYears} = await getAppSettings();
  return {weeks: lookbackWeeks, months: lookbackMonths, years: lookbackYears};
}
