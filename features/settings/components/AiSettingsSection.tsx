"use client";

import {type Key, useState} from "react";
import {useRouter} from "next/navigation";
import {Button, Input, Label, ListBox, Select, TextField} from "@heroui/react";
import {LuCheck, LuCircleAlert, LuPlug} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {PipelineMode} from "@/prisma/generated/client";
import type {AiSettingsForm} from "@/features/settings/db/aiSettings";
import {
  type TestConnectionResult,
  testAiConnection,
  updateAiSettings,
} from "@/features/settings/db/aiSettingsMutations";
import {SectionCard} from "@/features/settings/components/SectionCard";

const MODE_OPTIONS: {id: PipelineMode; name: string}[] = [
  {id: "DOCUMENT_AI", name: "Document AI (one-shot)"},
  {id: "SEPARATED", name: "Separated (OCR → extract)"},
];

// Edit surface for the AI / document-processing provider config (Phase 8b). Form-shaped
// (edit-then-Save), unlike the per-row immediate writes in ReferenceDataManager. The raw API key is
// never sent here — `settings.hasApiKey` tells us whether one is stored; leaving the field blank on
// Save keeps the existing key.
export default function AiSettingsSection({settings}: {settings: AiSettingsForm}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [ocrModel, setOcrModel] = useState(settings.ocrModel);
  const [extractModel, setExtractModel] = useState(settings.extractModel);
  const [pipelineMode, setPipelineMode] = useState<PipelineMode>(settings.pipelineMode);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateAiSettings({enabled, apiKey, baseUrl, ocrModel, extractModel, pipelineMode});
      setApiKey(""); // revert the field to its masked "keep existing" state
      setSaved(true);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await testAiConnection({apiKey, baseUrl}));
    } catch {
      setTestResult({ok: false, message: "Could not run the connection test."});
    } finally {
      setTesting(false);
    }
  }

  return (
    <SectionCard
      title="Document processing (AI)"
      description="Provider used to read uploaded documents and auto-create expenses. Provider-generic — set the API key, an optional base URL, and which models to use."
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}/>
        Enable document processing
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          value={apiKey}
          onChange={setApiKey}
          aria-label="API key"
          className="flex flex-col gap-1 sm:col-span-2"
        >
          <Label className={labelClass}>API key</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings.hasApiKey ? "•••• saved — leave blank to keep" : "Enter API key"}
          />
        </TextField>

        <TextField value={baseUrl} onChange={setBaseUrl} aria-label="Base URL" className="flex flex-col gap-1 sm:col-span-2">
          <Label className={labelClass}>Base URL (optional)</Label>
          <Input placeholder="https://api.mistral.ai"/>
        </TextField>

        <Select
          value={pipelineMode}
          onChange={(key: Key | null) => {
            if (key != null) setPipelineMode(String(key) as PipelineMode);
          }}
          aria-label="Pipeline mode"
          className="flex flex-col gap-1"
        >
          <Label className={labelClass}>Pipeline mode</Label>
          <Select.Trigger>
            <Select.Value/>
            <Select.Indicator/>
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {MODE_OPTIONS.map((option) => (
                <ListBox.Item key={option.id} id={option.id} textValue={option.name}>
                  {option.name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField value={ocrModel} onChange={setOcrModel} aria-label="OCR model" className="flex flex-col gap-1">
          <Label className={labelClass}>OCR model</Label>
          <Input placeholder="mistral-ocr-latest"/>
        </TextField>

        {pipelineMode === "SEPARATED" ? (
          <TextField value={extractModel} onChange={setExtractModel} aria-label="Extraction model" className="flex flex-col gap-1 sm:col-span-2">
            <Label className={labelClass}>Extraction model</Label>
            <Input placeholder="mistral-small-latest"/>
            <p className="text-xs text-muted">Chat model for the extraction step (Separated mode only).</p>
          </TextField>
        ) : null}
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-success">Saved.</p> : null}
      {testResult ? (
        <p className={`flex items-center gap-1.5 text-sm ${testResult.ok ? "text-success" : "text-danger"}`}>
          {testResult.ok ? <LuCheck className="size-4"/> : <LuCircleAlert className="size-4"/>}
          {testResult.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="primary" isDisabled={busy} onPress={onSave}>
          Save
        </Button>
        <Button type="button" size="sm" variant="secondary" isDisabled={testing} onPress={onTest}>
          <LuPlug className="size-4"/>
          {testing ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </SectionCard>
  );
}
