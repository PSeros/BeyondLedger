import {client} from "@/lib/prisma";

// Read side for the Home Assistant MQTT bridge config (Phase 17). Config is a singleton row
// (always id: 1, created on first read via upsert). Consumed by the /settings UI and — for the raw
// password — by the bridge itself.
//
// SECURITY: getMqttSettings() returns the plaintext password and is SERVER-ONLY (it imports the
// Prisma client, so it can never be pulled into a client bundle). The client only ever receives
// MqttSettingsForm, which replaces password with a hasPassword boolean.

export const MQTT_SETTINGS_ID = 1;

export const MIN_PUBLISH_INTERVAL_SECONDS = 30;
export const MAX_PUBLISH_INTERVAL_SECONDS = 3600;

export type MqttSettings = {
  enabled: boolean;
  host: string;
  port: number;
  useTls: boolean;
  username: string;
  password: string;
  clientId: string;
  topicPrefix: string;
  discoveryPrefix: string;
  currency: string;
  appUrl: string;
  publishIntervalSeconds: number;
};

// Client-safe projection: no raw password, just whether one is stored.
export type MqttSettingsForm = Omit<MqttSettings, "password"> & {hasPassword: boolean};

// Full config incl. password. SERVER-ONLY — never pass the result to a client component.
export async function getMqttSettings(): Promise<MqttSettings> {
  return client.mqttSettings.upsert({
    where: {id: MQTT_SETTINGS_ID},
    create: {id: MQTT_SETTINGS_ID},
    update: {},
    select: {
      enabled: true,
      host: true,
      port: true,
      useTls: true,
      username: true,
      password: true,
      clientId: true,
      topicPrefix: true,
      discoveryPrefix: true,
      currency: true,
      appUrl: true,
      publishIntervalSeconds: true,
    },
  });
}

// Client-safe read for the Settings page.
export async function getMqttSettingsForm(): Promise<MqttSettingsForm> {
  const {password, ...rest} = await getMqttSettings();
  return {...rest, hasPassword: password.trim() !== ""};
}

export function clampPublishInterval(seconds: number): number {
  if (!Number.isFinite(seconds)) return 300;
  return Math.min(MAX_PUBLISH_INTERVAL_SECONDS, Math.max(MIN_PUBLISH_INTERVAL_SECONDS, Math.round(seconds)));
}
