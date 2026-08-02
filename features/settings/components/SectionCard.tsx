import type {ReactNode} from "react";

// Shared card shell for the /settings sections (reference-data lists + the AI config).
export function SectionCard({title, count, description, children}: {
  title: string;
  count?: number;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-default bg-surface flex h-full flex-col gap-3 rounded-[var(--radius)] border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {typeof count === "number" ? (
          <span className="bg-surface-secondary shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums text-muted">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
