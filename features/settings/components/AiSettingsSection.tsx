"use client";

import {type Key, useState} from "react";
import {useTranslations} from "next-intl";
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

// Edit surface for the AI / document-processing provider config (Phase 8b). Form-shaped
// (edit-then-Save), unlike the per-row immediate writes in ReferenceDataManager. The raw API key is
// never sent here — `settings.hasApiKey` tells us whether one is stored; leaving the field blank on
// Save keeps the existing key.
export default function AiSettingsSection({settings}: {settings: AiSettingsForm}) {
  const router = useRouter();
  const t = useTranslations("settings.ai");
  const tCommon = useTranslations("common");
  const modeOptions: {id: PipelineMode; name: string}[] = [
    {id: "DOCUMENT_AI", name: t("modeDocumentAi")},
    {id: "SEPARATED", name: t("modeSeparated")},
  ];
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
      setError(saveError instanceof Error ? saveError.message : t("couldNotSave"));
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
      setTestResult({ok: false, message: t("couldNotTest")});
    } finally {
      setTesting(false);
    }
  }

  return (
    <SectionCard
      title={t("title")}
      description={t("description")}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}/>
        {t("enable")}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          value={apiKey}
          onChange={setApiKey}
          aria-label={t("apiKey")}
          className="flex flex-col gap-1 sm:col-span-2"
        >
          <Label className={labelClass}>{t("apiKey")}</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings.hasApiKey ? t("apiKeySavedPlaceholder") : t("apiKeyPlaceholder")}
          />
        </TextField>

        <TextField value={baseUrl} onChange={setBaseUrl} aria-label={t("baseUrl")} className="flex flex-col gap-1 sm:col-span-2">
          <Label className={labelClass}>{t("baseUrlLabel")}</Label>
          <Input placeholder="https://api.mistral.ai"/>
        </TextField>

        <Select
          value={pipelineMode}
          onChange={(key: Key | null) => {
            if (key != null) setPipelineMode(String(key) as PipelineMode);
          }}
          aria-label={t("pipelineMode")}
          className="flex flex-col gap-1"
        >
          <Label className={labelClass}>{t("pipelineMode")}</Label>
          <Select.Trigger>
            <Select.Value/>
            <Select.Indicator/>
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {modeOptions.map((option) => (
                <ListBox.Item key={option.id} id={option.id} textValue={option.name}>
                  {option.name}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField value={ocrModel} onChange={setOcrModel} aria-label={t("ocrModel")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("ocrModel")}</Label>
          <Input placeholder="mistral-ocr-latest"/>
        </TextField>

        {pipelineMode === "SEPARATED" ? (
          <TextField value={extractModel} onChange={setExtractModel} aria-label={t("extractModel")} className="flex flex-col gap-1 sm:col-span-2">
            <Label className={labelClass}>{t("extractModel")}</Label>
            <Input placeholder="mistral-small-latest"/>
            <p className="text-xs text-muted">{t("extractModelHint")}</p>
          </TextField>
        ) : null}
      </div>

      {error ? <p className="text-danger text-sm">{error}</p> : null}
      {saved && !error ? <p className="text-sm text-success">{t("saved")}</p> : null}
      {testResult ? (
        <p className={`flex items-center gap-1.5 text-sm ${testResult.ok ? "text-success" : "text-danger"}`}>
          {testResult.ok ? <LuCheck className="size-4"/> : <LuCircleAlert className="size-4"/>}
          {testResult.message}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="primary" isDisabled={busy} onPress={onSave}>
          {tCommon("save")}
        </Button>
        <Button type="button" size="sm" variant="secondary" isDisabled={testing} onPress={onTest}>
          <LuPlug className="size-4"/>
          {testing ? t("testing") : t("testConnection")}
        </Button>
      </div>
    </SectionCard>
  );
}
