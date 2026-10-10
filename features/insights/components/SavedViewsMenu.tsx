"use client";

import {useState, useTransition} from "react";
import {useTranslations} from "next-intl";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {Button, Input, Popover} from "@heroui/react";
import {LuBookmark, LuCheck, LuPencil, LuTrash2, LuX} from "react-icons/lu";
import type {SavedView} from "@/features/insights/db/views";
import {
  createInsightsView,
  deleteInsightsView,
  renameInsightsView,
  updateInsightsViewQuery,
} from "@/features/insights/db/viewMutations";
import {parseInsightsQuery, serializeViewQuery} from "@/features/insights/params";

type RowMode = {id: number; kind: "rename" | "delete"} | null;

// Saved views: open, save the current state as a new view, update the open view (?view) when it was
// changed, rename and delete. One Popover with inline states, so no overlay ever nests in another.
export default function SavedViewsMenu({views}: {views: SavedView[]}) {
  const t = useTranslations("insights");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [rowMode, setRowMode] = useState<RowMode>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeId = Number(searchParams.get("view")) || null;
  const active = views.find((view) => view.id === activeId) ?? null;
  const current = serializeViewQuery(parseInsightsQuery(searchParams));
  const isModified = active != null && active.query !== current;

  const go = (query: string, viewId: number | null) => {
    const params = new URLSearchParams(query);
    if (viewId != null) params.set("view", String(viewId));
    const next = params.toString();
    router.push(next ? `${pathname}?${next}` : pathname, {scroll: false});
  };

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : String(actionError));
      }
    });
  }

  const saveNew = () => run(async () => {
    const id = await createInsightsView(newName, current);
    setNewName("");
    setIsOpen(false);
    go(current, id);
  });

  const saveRename = (id: number) => run(async () => {
    await renameInsightsView(id, renameDraft);
    setRowMode(null);
  });

  const confirmDelete = (id: number) => run(async () => {
    await deleteInsightsView(id);
    setRowMode(null);
    if (id === activeId) go(current, null);
  });

  return (
    <Popover isOpen={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        setRowMode(null);
        setError(null);
      }
    }}>
      <Button size="sm" variant={active ? "secondary" : "tertiary"} className="max-w-56">
        <LuBookmark className="shrink-0"/>
        <span className="truncate">{active ? active.name : t("views")}</span>
        {isModified ? <span className="text-warning" aria-label={t("viewModified")}>•</span> : null}
      </Button>
      <Popover.Content placement="bottom end">
        <Popover.Dialog className="flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 p-3">
          <p className="text-foreground-500 text-xs font-medium uppercase tracking-wide">{t("savedViews")}</p>

          {views.length === 0 ? <p className="text-sm text-muted">{t("noViews")}</p> : null}
          <ul className="flex flex-col gap-1">
            {views.map((view) => {
              const mode = rowMode?.id === view.id ? rowMode.kind : null;
              if (mode === "rename") {
                return (
                  <li key={view.id} className="flex items-center gap-1">
                    <Input
                      aria-label={t("viewName")}
                      value={renameDraft}
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => event.key === "Enter" && saveRename(view.id)}
                      autoFocus
                      className="min-w-0 flex-1"
                    />
                    <Button size="sm" isIconOnly variant="tertiary" aria-label={tCommon("save")} isDisabled={isPending} onPress={() => saveRename(view.id)}>
                      <LuCheck/>
                    </Button>
                    <Button size="sm" isIconOnly variant="tertiary" aria-label={tCommon("cancel")} onPress={() => setRowMode(null)}>
                      <LuX/>
                    </Button>
                  </li>
                );
              }
              if (mode === "delete") {
                return (
                  <li key={view.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1">
                    <span className="min-w-0 truncate text-sm">{tCommon("deleteConfirm", {label: view.name})}</span>
                    <span className="flex shrink-0 gap-1">
                      <Button size="sm" variant="tertiary" onPress={() => setRowMode(null)}>{tCommon("cancel")}</Button>
                      <Button size="sm" variant="danger" isDisabled={isPending} onPress={() => confirmDelete(view.id)}>
                        {tCommon("delete")}
                      </Button>
                    </span>
                  </li>
                );
              }
              return (
                <li key={view.id} className="group flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={view.id === activeId ? "secondary" : "ghost"}
                    className="min-w-0 flex-1 justify-start"
                    onPress={() => {
                      setIsOpen(false);
                      go(view.query, view.id);
                    }}
                  >
                    <span className="truncate">{view.name}</span>
                  </Button>
                  <Button size="sm" isIconOnly variant="ghost" aria-label={t("renameView")} onPress={() => {
                    setRenameDraft(view.name);
                    setRowMode({id: view.id, kind: "rename"});
                  }}>
                    <LuPencil/>
                  </Button>
                  <Button size="sm" isIconOnly variant="ghost" aria-label={tCommon("delete")} onPress={() => setRowMode({id: view.id, kind: "delete"})}>
                    <LuTrash2/>
                  </Button>
                </li>
              );
            })}
          </ul>

          {isModified && active ? (
            <Button size="sm" variant="secondary" isDisabled={isPending} onPress={() => run(() => updateInsightsViewQuery(active.id, current))}>
              {t("updateView", {name: active.name})}
            </Button>
          ) : null}

          <div className="flex items-center gap-1 border-t border-[var(--border)] pt-3">
            <Input
              aria-label={t("viewName")}
              placeholder={t("viewNamePlaceholder")}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && newName.trim() && saveNew()}
              className="min-w-0 flex-1"
            />
            <Button size="sm" isDisabled={isPending || !newName.trim()} onPress={saveNew}>
              {t("saveView")}
            </Button>
          </div>
          {error ? <p className="text-danger text-xs">{error}</p> : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
