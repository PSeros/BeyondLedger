import type {ReactNode} from "react";

// Shared card shell for every /settings block (reference-data lists, the AI config, the
// preference forms). `id` is the anchor the settings search jumps to.
// `title` is optional: on the preference pages the surrounding SettingsSection already carries the
// heading, so the card is used as a bare shell.
export function SectionCard({id, title, count, description, children}: {
  id?: string;
  title?: string;
  count?: number;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="border-default bg-surface flex h-full scroll-mt-4 flex-col gap-3 rounded-[var(--radius)] border p-5"
    >
      {title || description || typeof count === "number" ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
          </div>
          {typeof count === "number" ? (
            <span className="bg-surface-secondary shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums text-muted">
              {count}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
