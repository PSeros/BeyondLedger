import React from "react"

// Shared shell for both income tabs. The toolbar (VFSwitch + search + actions) lives per-page now
// (mirrors the expense route) so each tab supplies its own isRecurring context and tab-specific
// filters. Per-segment @modal layouts for the detail modal are added under fixed/ and variable/.
export default function IncomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      {children}
    </section>
  );
}
