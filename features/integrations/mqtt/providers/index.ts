import {budgetProvider} from "@/features/integrations/mqtt/providers/budgetProvider";
import type {EntityProvider} from "@/features/integrations/mqtt/types";

// THE extension point. Adding a new kind of Home Assistant entity = write one provider file and
// append it here; nothing in bridge.ts / publish.ts / discovery.ts needs to change.
//
// Planned, roughly in order of value:
//   - ocr        — documents whose extraction failed / auto-created bills awaiting review. The one
//                  case where HA genuinely beats the app: you dropped a PDF in and walked away.
//   - upcoming   — next fixed expense due (timestamp) + count within AppSettings.upcomingWindowDays
//   - backup     — last successful backup timestamp, so HA can nag when it goes stale
//   - totals     — month-to-date expense / income / net per workspace, for HA's free long-term
//                  statistics and history graphs
//   - warranty   — items whose warranty expires within AppSettings.warrantyWarnDays
//
// Provider ids must be unique and topic-safe: the id is both a topic segment and part of every
// entity's unique_id, so renaming one orphans its entities in HA's registry.
export const providers: EntityProvider[] = [budgetProvider];
