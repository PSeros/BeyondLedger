import type {SettingsSectionKey} from "@/features/settings/nav";

// Flat index of every individual setting, so the search box can jump straight to it instead of
// making people guess which section it lives under. `labelKey` is resolved against the root message
// catalog at render time (dotted, e.g. "settings.ai.apiKey") — matching happens on the *translated*
// label, so the index stays locale-agnostic.
//
// `anchor` must match the id passed to the SettingsSection/SectionCard on that page.
//
// NEUTRAL MODULE (no "use client") — same reason as nav.ts.

export type SettingsSearchEntry = {
  section: SettingsSectionKey;
  anchor: string;
  labelKey: string;
};

export const settingsSearchIndex: SettingsSearchEntry[] = [
  {section: "general", anchor: "language", labelKey: "settings.language"},
  {section: "general", anchor: "appearance", labelKey: "settings.appearance.heading"},
  {section: "general", anchor: "windows", labelKey: "settings.windows.warrantyLabel"},
  {section: "general", anchor: "windows", labelKey: "settings.windows.upcomingLabel"},

  {section: "data", anchor: "suppliers", labelKey: "settings.suppliers"},
  {section: "data", anchor: "frequencies", labelKey: "settings.billingFrequencies"},
  {section: "data", anchor: "supplier-categories", labelKey: "settings.supplierCategories"},
  {section: "data", anchor: "item-categories", labelKey: "settings.itemCategories"},
  {section: "data", anchor: "contract-categories", labelKey: "settings.contractCategories"},
  {section: "data", anchor: "income-sources", labelKey: "settings.incomeSources"},
  {section: "data", anchor: "income-categories", labelKey: "settings.incomeCategories"},

  {section: "tags", anchor: "accounts", labelKey: "workspaces.title"},
  {section: "tags", anchor: "tags", labelKey: "tags.title"},

  {section: "ai", anchor: "ai", labelKey: "settings.ai.enable"},
  {section: "ai", anchor: "ai", labelKey: "settings.ai.apiKey"},
  {section: "ai", anchor: "ai", labelKey: "settings.ai.baseUrl"},
  {section: "ai", anchor: "ai", labelKey: "settings.ai.pipelineMode"},
  {section: "ai", anchor: "ai", labelKey: "settings.ai.ocrModel"},
  {section: "ai", anchor: "ai", labelKey: "settings.ai.extractModel"},

  {section: "backup", anchor: "backup", labelKey: "settings.backup.download"},
  {section: "backup", anchor: "backup", labelKey: "settings.backup.restore"},
];
