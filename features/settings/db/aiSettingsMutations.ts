"use server";

import {revalidatePath} from "next/cache";
import {client} from "@/lib/prisma";
import {PipelineMode} from "@/prisma/generated/client";
import {AI_SETTINGS_ID, DEFAULT_MISTRAL_BASE_URL, getAiSettings} from "@/features/settings/db/aiSettings";

// Write side + connection check for the AI / document-processing provider config (Phase 8b).
// Mirrors the referenceDataMutations conventions ("use server", revalidatePath after a write).

export type AiSettingsUpdate = {
  enabled: boolean;
  apiKey: string; // blank => keep the existing stored key (the masked UI never wipes it)
  baseUrl: string; // blank => stored as null
  ocrModel: string;
  extractModel: string;
  pipelineMode: PipelineMode;
};

function cleanModel(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed === "" ? fallback : trimmed;
}

export async function updateAiSettings(input: AiSettingsUpdate): Promise<void> {
  const baseUrl = input.baseUrl.trim();
  const newKey = input.apiKey.trim();

  await client.aiSettings.upsert({
    where: {id: AI_SETTINGS_ID},
    create: {
      id: AI_SETTINGS_ID,
      enabled: input.enabled,
      apiKey: newKey,
      baseUrl: baseUrl === "" ? null : baseUrl,
      ocrModel: cleanModel(input.ocrModel, "mistral-ocr-latest"),
      extractModel: cleanModel(input.extractModel, "mistral-small-latest"),
      pipelineMode: input.pipelineMode,
    },
    update: {
      enabled: input.enabled,
      // Only overwrite the key when a new non-empty value was submitted.
      ...(newKey === "" ? {} : {apiKey: newKey}),
      baseUrl: baseUrl === "" ? null : baseUrl,
      ocrModel: cleanModel(input.ocrModel, "mistral-ocr-latest"),
      extractModel: cleanModel(input.extractModel, "mistral-small-latest"),
      pipelineMode: input.pipelineMode,
    },
  });

  revalidatePath("/settings");
}

export type TestConnectionResult = {ok: boolean; message: string};

// Pings the provider's model-list endpoint with the given (typed-but-unsaved) key/host, falling
// back to the stored values. Provider-generic: hits <baseUrl>/v1/models with a Bearer token, the
// shape Mistral (and OpenAI-compatible hosts) use. Never throws to the client.
export async function testAiConnection(
  overrides?: {apiKey?: string; baseUrl?: string},
): Promise<TestConnectionResult> {
  const stored = await getAiSettings();
  const apiKey = (overrides?.apiKey?.trim() || "") || stored.apiKey;
  const baseUrl =
    (overrides?.baseUrl?.trim() || "") || stored.baseUrl || DEFAULT_MISTRAL_BASE_URL;

  if (apiKey.trim() === "") {
    return {ok: false, message: "No API key set — enter one above first."};
  }

  const url = `${baseUrl.replace(/\/+$/, "")}/v1/models`;
  try {
    const res = await fetch(url, {
      headers: {Authorization: `Bearer ${apiKey}`},
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      return {ok: true, message: "Connection successful."};
    }
    if (res.status === 401 || res.status === 403) {
      return {ok: false, message: "Authentication failed — check the API key."};
    }
    return {ok: false, message: `Provider returned ${res.status} ${res.statusText}.`};
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return {ok: false, message: "Connection timed out — check the base URL."};
    }
    return {
      ok: false,
      message: `Could not reach the provider${overrides?.baseUrl?.trim() ? ` at ${baseUrl}` : ""}.`,
    };
  }
}
