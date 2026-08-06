"use client";

import {useTranslations} from "next-intl";
import CreatableSelect from "@/features/expense/shared/components/CreatableSelect";
import type {WorkspaceOption} from "@/features/workspaces/types";

// The account (Workspace) picker for entry/budget forms. A plain single-select (accounts are managed
// in Settings, so no inline "+ create") that posts a hidden <input name="workspaceId">. Pre-selected
// to the active account by the caller. Reuses CreatableSelect so it matches the other form selects
// pixel-for-pixel.
export default function WorkspaceSelectField({
  workspaces,
  defaultValue,
  name = "workspaceId",
}: {
  workspaces: WorkspaceOption[];
  defaultValue?: string;
  name?: string;
}) {
  const t = useTranslations("workspaces");
  return (
    <CreatableSelect
      label={t("label")}
      name={name}
      options={workspaces}
      defaultValue={defaultValue}
      placeholder={t("placeholder")}
    />
  );
}
