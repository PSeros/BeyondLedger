"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {
  MQTT_SETTINGS_ID,
  clampPublishInterval,
  getMqttSettings,
} from "@/features/integrations/db/mqttSettings";

// Write side + connection check for the Home Assistant MQTT bridge config (Phase 17). Mirrors the
// aiSettingsMutations conventions ("use server", revalidatePath after a write, a test action that
// accepts unsaved values and never throws).
//
// The bridge module is only ever reached through a DYNAMIC import here: a static one would pull the
// `mqtt` client into every server-action bundle.

export type MqttSettingsUpdate = {
  enabled: boolean;
  host: string;
  port: number;
  useTls: boolean;
  username: string;
  password: string; // blank => keep the existing stored password (the masked UI never wipes it)
  clientId: string;
  topicPrefix: string;
  discoveryPrefix: string;
  currency: string;
  appUrl: string;
  publishIntervalSeconds: number;
};

export type TestConnectionResult = {ok: boolean; message: string};

function clean(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed === "" ? fallback : trimmed;
}

function normalizePort(port: number): number {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Port must be a whole number between 1 and 65535.");
  }
  return port;
}

export async function updateMqttSettings(input: MqttSettingsUpdate): Promise<void> {
  const newPassword = input.password.trim();
  const data = {
    enabled: input.enabled,
    host: input.host.trim(),
    port: normalizePort(input.port),
    useTls: input.useTls,
    username: input.username.trim(),
    clientId: clean(input.clientId, "beyondledger"),
    topicPrefix: clean(input.topicPrefix, "beyondledger"),
    discoveryPrefix: clean(input.discoveryPrefix, "homeassistant"),
    currency: clean(input.currency, "EUR").toUpperCase(),
    appUrl: input.appUrl.trim(),
    publishIntervalSeconds: clampPublishInterval(input.publishIntervalSeconds),
  };

  await client.mqttSettings.upsert({
    where: {id: MQTT_SETTINGS_ID},
    create: {id: MQTT_SETTINGS_ID, ...data, password: newPassword},
    // Only overwrite the password when a new non-empty value was submitted.
    update: {...data, ...(newPassword === "" ? {} : {password: newPassword})},
  });

  revalidatePath("/settings");

  // Apply the new config without waiting for a process restart. Failing to restart the bridge must
  // not fail the save — the settings are already persisted at this point.
  try {
    const {restartMqttBridge} = await import("@/features/integrations/mqtt/bridge");
    await restartMqttBridge();
  } catch (error) {
    console.error("[mqtt] could not restart the bridge after a settings change", error);
  }
}

/// Pings the broker with the given (typed-but-unsaved) connection details, falling back to the
/// stored ones. Never throws to the client.
export async function testMqttConnection(overrides?: {
  host?: string;
  port?: number;
  useTls?: boolean;
  username?: string;
  password?: string;
  clientId?: string;
}): Promise<TestConnectionResult> {
  try {
    const stored = await getMqttSettings();
    const password = overrides?.password?.trim() ?? "";
    const {testMqttConnection: run} = await import("@/features/integrations/mqtt/bridge");

    return await run({
      host: overrides?.host?.trim() || stored.host,
      port: overrides?.port ?? stored.port,
      useTls: overrides?.useTls ?? stored.useTls,
      username: overrides?.username?.trim() ?? stored.username,
      // Blank means "use the stored one", matching the masked field's Save behaviour.
      password: password === "" ? stored.password : password,
      clientId: overrides?.clientId?.trim() || stored.clientId,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not run the connection test.",
    };
  }
}
