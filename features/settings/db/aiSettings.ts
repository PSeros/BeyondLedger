import {client} from "@/lib/prisma";
import type {PipelineMode} from "@/prisma/generated/client";

// Read side for the AI / document-processing provider config (Phase 8b). Config is a singleton row
// (always id: 1, created on first read via upsert). Consumed by the /settings UI and — for the raw
// apiKey — by the extraction pipeline (8c/8d).
//
// SECURITY: getAiSettings() returns the plaintext apiKey and is SERVER-ONLY (it imports the Prisma
// client, so it can never be pulled into a client bundle). The client only ever receives
// AiSettingsForm, which replaces apiKey with a hasApiKey boolean.

export const AI_SETTINGS_ID = 1;
export const DEFAULT_MISTRAL_BASE_URL = "https://api.mistral.ai";

export type AiSettings = {
  enabled: boolean;
  apiKey: string;
  baseUrl: string | null;
  ocrModel: string;
  extractModel: string;
  pipelineMode: PipelineMode;
};

// Client-safe projection: no raw apiKey, just whether one is stored.
export type AiSettingsForm = {
  enabled: boolean;
  baseUrl: string;
  ocrModel: string;
  extractModel: string;
  pipelineMode: PipelineMode;
  hasApiKey: boolean;
};

// Full config incl. apiKey. SERVER-ONLY — never pass the result to a client component.
export async function getAiSettings(): Promise<AiSettings> {
  const row = await client.aiSettings.upsert({
    where: {id: AI_SETTINGS_ID},
    create: {id: AI_SETTINGS_ID},
    update: {},
    select: {
      enabled: true,
      apiKey: true,
      baseUrl: true,
      ocrModel: true,
      extractModel: true,
      pipelineMode: true,
    },
  });
  return row;
}

// Client-safe read for the Settings page.
export async function getAiSettingsForm(): Promise<AiSettingsForm> {
  const {apiKey, baseUrl, ...rest} = await getAiSettings();
  return {
    ...rest,
    baseUrl: baseUrl ?? "",
    hasApiKey: apiKey.trim() !== "",
  };
}
