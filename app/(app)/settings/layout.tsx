import type {ReactNode} from "react";
import SettingsNav from "@/features/settings/components/SettingsNav";
import SettingsNavTabs from "@/features/settings/components/SettingsNavTabs";

// Shell for the /settings area: the section nav (vertical rail at lg+, tab row below) plus the
// single scroll container the sub-pages render into. Pages therefore render a plain section stack
// and never own their own scrolling — unlike the list pages, where the page is the shell.
//
// No PageToolbar here: the rail replaces it at lg+, so a toolbar row would just be empty space.
export default function SettingsLayout({children}: {children: ReactNode}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <SettingsNavTabs className="mb-4 lg:hidden"/>
      <div className="flex min-h-0 flex-1 gap-6">
        <SettingsNav className="hidden lg:flex"/>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-6 [scrollbar-gutter:stable]">
          {children}
        </div>
      </div>
    </section>
  );
}
