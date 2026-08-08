"use client";

import {useRef, useState} from "react";
import {useTranslations} from "next-intl";
import {Button} from "@heroui/react";
import {LuDownload, LuUpload} from "react-icons/lu";

// Backup & Restore. "Download" streams a complete .tar.gz (DB snapshot + uploads) from
// /api/backup. "Restore" posts an archive to /api/restore, which validates it, swaps the data in
// (keeping .bak copies) and — in production — restarts the app so the restored DB takes effect.
type Status = {kind: "error" | "success"; message: string};

export default function BackupSettingsSection() {
  const t = useTranslations("settings.backup");
  const tCommon = useTranslations("settings");
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "restore">(null);
  const [status, setStatus] = useState<Status | null>(null);

  function download() {
    setStatus(null);
    window.location.href = "/api/backup";
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!window.confirm(t("confirm"))) return;

    setBusy("restore");
    setStatus(null);
    try {
      const body = new FormData();
      body.append("archive", file);
      const response = await fetch("/api/restore", {method: "POST", body});
      const data = (await response.json().catch(() => ({}))) as {error?: string; restarting?: boolean};
      if (!response.ok) {
        throw new Error(data.error ?? tCommon("somethingWrong"));
      }
      if (data.restarting) {
        setStatus({kind: "success", message: t("restarting")});
        setTimeout(() => window.location.reload(), 6000);
      } else {
        setStatus({kind: "success", message: t("restoredNeedsRestart")});
      }
    } catch (error) {
      setStatus({kind: "error", message: error instanceof Error ? error.message : tCommon("somethingWrong")});
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-default bg-surface flex flex-col gap-3 rounded-[var(--radius)] border p-5">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onPress={download} isDisabled={busy !== null}>
          <LuDownload aria-hidden/>
          {t("download")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onPress={() => fileRef.current?.click()}
          isPending={busy === "restore"}
          isDisabled={busy !== null}
        >
          <LuUpload aria-hidden/>
          {t("restore")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".gz,.tgz,application/gzip"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
      <p className="text-xs text-muted">{t("hint")}</p>
      {status ? (
        <p className={status.kind === "error" ? "text-danger text-sm" : "text-success text-sm"}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
