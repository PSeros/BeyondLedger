"use client";

import {type Key, useState, useTransition} from "react";
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {Label, ListBox, Select} from "@heroui/react";
import {setActiveWorkspace} from "@/features/settings/db/appSettingsMutations";
import type {WorkspaceOption} from "@/features/workspaces/types";

// Global account (Workspace) switcher shown in the Topbar. The active account is persisted in the
// AppSettings singleton, so this is a "which account am I looking at" mode that sticks across all
// navigation. Selecting one runs the server action (which revalidates the whole tree — re-running
// every list page + client-table server render) then refreshes so filters update immediately.
// The "all" sentinel maps to null = "All accounts" (no filter).
const ALL = "all";

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: number | null;
}) {
  const router = useRouter();
  const t = useTranslations("workspaces");
  const [current, setCurrent] = useState(activeWorkspaceId != null ? String(activeWorkspaceId) : ALL);
  const [isPending, startTransition] = useTransition();

  function onChange(key: Key | null) {
    if (key == null) return;
    const next = String(key);
    setCurrent(next);
    startTransition(async () => {
      await setActiveWorkspace(next === ALL ? null : Number(next));
      router.refresh();
    });
  }

  return (
    <Select
      value={current}
      onChange={onChange}
      isDisabled={isPending}
      aria-label={t("switcherLabel")}
      className="flex w-44 flex-col"
    >
      <Label className="sr-only">{t("switcherLabel")}</Label>
      <Select.Trigger>
        <Select.Value/>
        <Select.Indicator/>
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id={ALL} textValue={t("allAccounts")}>{t("allAccounts")}</ListBox.Item>
          {workspaces.map((workspace) => (
            <ListBox.Item key={workspace.id} id={String(workspace.id)} textValue={workspace.name}>
              <span className="size-2.5 shrink-0 rounded-full" style={{backgroundColor: workspace.color}}/>
              {workspace.name}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
