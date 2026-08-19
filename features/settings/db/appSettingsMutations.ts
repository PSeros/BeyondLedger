"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {APP_SETTINGS_ID, DEFAULT_LOCALE, LOCALES, type Locale} from "@/features/settings/db/appSettings";
import {
  MAX_LOOKBACK_MONTHS,
  MAX_LOOKBACK_WEEKS,
  MAX_LOOKBACK_YEARS,
} from "@/features/settings/lookback";

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

// Dashboard reminder windows (Phase 12). Unlike the locale/account, these affect only the dashboard,
// so revalidate /settings (so the input reflects the saved value) and /dashboard — not the whole
// layout. Guarded to a non-negative integer; anything else throws so the client surfaces it.
function normalizeDays(days: number): number {
  if (!Number.isInteger(days) || days < 0) {
    throw new Error("Reminder window must be a non-negative whole number of days.");
  }
  return days;
}

export async function updateWarrantyWarnDays(days: number): Promise<void> {
  const next = normalizeDays(days);

  await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID, warrantyWarnDays: next},
    update: {warrantyWarnDays: next},
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateUpcomingWindowDays(days: number): Promise<void> {
  const next = normalizeDays(days);

  await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID, upcomingWindowDays: next},
    update: {upcomingWindowDays: next},
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

// Ø-baseline lookback (per granularity). Unlike the reminder windows this reaches every chart in the
// app — the dashboard, both expense tabs and both income tabs — so revalidate the whole layout
// rather than naming five paths, matching updateLocale's reasoning.
function normalizeLookback(periods: number, max: number, unit: string): number {
  if (!Number.isInteger(periods) || periods < 1 || periods > max) {
    throw new Error(`Lookback must be a whole number of ${unit} between 1 and ${max}.`);
  }
  return periods;
}

export async function updateLookback({
  weeks,
  months,
  years,
}: {weeks: number; months: number; years: number}): Promise<void> {
  const lookbackWeeks = normalizeLookback(weeks, MAX_LOOKBACK_WEEKS, "weeks");
  const lookbackMonths = normalizeLookback(months, MAX_LOOKBACK_MONTHS, "months");
  const lookbackYears = normalizeLookback(years, MAX_LOOKBACK_YEARS, "years");

  await client.appSettings.upsert({
    where: {id: APP_SETTINGS_ID},
    create: {id: APP_SETTINGS_ID, lookbackWeeks, lookbackMonths, lookbackYears},
    update: {lookbackWeeks, lookbackMonths, lookbackYears},
  });

  revalidatePath("/", "layout");
}
