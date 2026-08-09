"use client";

import {useState} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Button, Input, Label, TextField} from "@heroui/react";
import {LuCheck, LuCircleAlert, LuPlug} from "react-icons/lu";
import {labelClass} from "@/features/expense/shared/components/FormFields";
import type {MqttSettingsForm} from "@/features/integrations/db/mqttSettings";
import {
  type TestConnectionResult,
  testMqttConnection,
  updateMqttSettings,
} from "@/features/integrations/db/mqttSettingsMutations";
import type {MqttBridgeStatus} from "@/features/integrations/mqtt/runtime";
import {SectionCard} from "@/features/settings/components/SectionCard";

// Edit surface for the Home Assistant MQTT bridge (Phase 17). Form-shaped (edit-then-Save) like the
// AI section. The raw password is never sent here — `settings.hasPassword` tells us whether one is
// stored; leaving the field blank on Save keeps the existing one.
export default function MqttSettingsSection({
  settings,
  status,
}: {
  settings: MqttSettingsForm;
  status: MqttBridgeStatus;
}) {
  const router = useRouter();
  const t = useTranslations("settings.mqtt");
  const tCommon = useTranslations("common");

  const [enabled, setEnabled] = useState(settings.enabled);
  const [host, setHost] = useState(settings.host);
  const [port, setPort] = useState(String(settings.port));
  const [useTls, setUseTls] = useState(settings.useTls);
  const [username, setUsername] = useState(settings.username);
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState(settings.clientId);
  const [topicPrefix, setTopicPrefix] = useState(settings.topicPrefix);
  const [discoveryPrefix, setDiscoveryPrefix] = useState(settings.discoveryPrefix);
  const [currency, setCurrency] = useState(settings.currency);
  const [appUrl, setAppUrl] = useState(settings.appUrl);
  const [interval, setInterval] = useState(String(settings.publishIntervalSeconds));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const isPort = (value: string) => {
    const n = Number(value);
    return value.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 65535;
  };
  const canSave = isPort(port) && Number.isFinite(Number(interval)) && interval.trim() !== "";

  async function onSave() {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await updateMqttSettings({
        enabled,
        host,
        port: Number(port),
        useTls,
        username,
        password,
        clientId,
        topicPrefix,
        discoveryPrefix,
        currency,
        appUrl,
        publishIntervalSeconds: Number(interval),
      });
      setPassword(""); // revert the field to its masked "keep existing" state
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
      setTestResult(
        await testMqttConnection({
          host,
          port: isPort(port) ? Number(port) : undefined,
          useTls,
          username,
          password,
          clientId,
        }),
      );
    } catch {
      setTestResult({ok: false, message: t("couldNotTest")});
    } finally {
      setTesting(false);
    }
  }

  const statusLabel = !status.running
    ? t("statusOff")
    : status.connected
      ? t("statusConnected", {broker: status.brokerHost})
      : t("statusDisconnected", {broker: status.brokerHost});

  return (
    <SectionCard>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}/>
        {t("enable")}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField value={host} onChange={setHost} aria-label={t("host")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("host")}</Label>
          <Input placeholder="homeassistant.local"/>
        </TextField>

        <TextField value={port} onChange={setPort} aria-label={t("port")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("port")}</Label>
          <Input type="number" step="1" min="1" max="65535" inputMode="numeric"/>
        </TextField>

        <TextField value={username} onChange={setUsername} aria-label={t("username")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("username")}</Label>
          <Input autoComplete="off"/>
        </TextField>

        <TextField value={password} onChange={setPassword} aria-label={t("password")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("password")}</Label>
          <Input
            type="password"
            autoComplete="off"
            placeholder={settings.hasPassword ? t("passwordSavedPlaceholder") : t("passwordPlaceholder")}
          />
        </TextField>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={useTls} onChange={(e) => setUseTls(e.target.checked)}/>
          {t("useTls")}
        </label>

        <TextField value={topicPrefix} onChange={setTopicPrefix} aria-label={t("topicPrefix")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("topicPrefix")}</Label>
          <Input placeholder="beyondledger"/>
        </TextField>

        <TextField value={discoveryPrefix} onChange={setDiscoveryPrefix} aria-label={t("discoveryPrefix")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("discoveryPrefix")}</Label>
          <Input placeholder="homeassistant"/>
          <p className="text-xs text-muted">{t("discoveryPrefixHint")}</p>
        </TextField>

        <TextField value={currency} onChange={setCurrency} aria-label={t("currency")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("currency")}</Label>
          <Input placeholder="EUR"/>
          <p className="text-xs text-muted">{t("currencyHint")}</p>
        </TextField>

        <TextField value={interval} onChange={setInterval} aria-label={t("publishInterval")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("publishInterval")}</Label>
          <Input type="number" step="1" min="30" max="3600" inputMode="numeric"/>
          <p className="text-xs text-muted">{t("publishIntervalHint")}</p>
        </TextField>

        <TextField value={clientId} onChange={setClientId} aria-label={t("clientId")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("clientId")}</Label>
          <Input placeholder="beyondledger"/>
        </TextField>

        <TextField value={appUrl} onChange={setAppUrl} aria-label={t("appUrl")} className="flex flex-col gap-1">
          <Label className={labelClass}>{t("appUrl")}</Label>
          <Input placeholder="http://192.168.1.50:3000"/>
          <p className="text-xs text-muted">{t("appUrlHint")}</p>
        </TextField>
      </div>

      <div className="text-xs text-muted">
        <p>{statusLabel}</p>
        {status.lastPublishAt ? (
          <p>{t("lastPublish", {when: status.lastPublishAt, count: status.objectCount})}</p>
        ) : null}
        {status.lastError ? <p className="text-danger">{status.lastError}</p> : null}
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
        <Button type="button" size="sm" variant="primary" isDisabled={busy || !canSave} onPress={onSave}>
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
