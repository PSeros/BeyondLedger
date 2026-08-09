import type {ReactNode} from "react";

// Heading + description block that opens every settings section. `id` is a link anchor, so a
// section can be deep-linked with a #hash (scroll-mt keeps the heading clear of the container top).
export function SettingsSection({id, heading, description, children}: {
  id?: string;
  heading: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-4 flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">{heading}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
