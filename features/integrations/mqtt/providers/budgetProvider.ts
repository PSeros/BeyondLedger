// Publishes every budget as a Home Assistant device with four entities: spent, target, percent
// used, and an over-budget binary_sensor.
//
// Scope note: budgets are read for ALL workspaces (getBudgetsResolved's workspaceId is omitted).
// AppSettings.activeWorkspaceId is a UI filter — hiding an account in the app must not silently
// delete its entities from Home Assistant.

import {getBudgetsResolved} from "@/features/budget/db/budgets";
import {budgetProgress} from "@/features/budget/progress";
import {dedupeSlugs, slugify} from "@/features/integrations/mqtt/topics";
import type {CollectContext, EntityProvider, PublishedObject} from "@/features/integrations/mqtt/types";

const PROVIDER_ID = "budget";

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export const budgetProvider: EntityProvider = {
  id: PROVIDER_ID,

  async collect(ctx: CollectContext): Promise<PublishedObject[]> {
    // `now` is the FIRST parameter here; the second is workspaceId, deliberately omitted.
    const budgets = await getBudgetsResolved(ctx.now);
    const slugs = dedupeSlugs(
      budgets,
      (budget) => slugify(budget.name),
      (budget) => String(budget.id),
    );
    const publishedAt = ctx.now.toISOString();

    return budgets.map((budget) => {
      const progress = budgetProgress(budget.target, budget.actual);

      return {
        localId: String(budget.id),
        slug: `${PROVIDER_ID}_${slugs.get(budget) ?? String(budget.id)}`,
        deviceName: `${budget.name} budget`,
        deviceModel: "Budget",
        primaryEntityKey: "spent",
        state: {
          name: budget.name,
          // Rounded: unrounded float noise would rewrite HA's recorder on every tick.
          spent: round(budget.actual, 2),
          target: round(budget.target, 2),
          remaining: round(progress.remaining, 2),
          percent: round(progress.percent, 1),
          over: progress.isOver,
          period_type: budget.periodType,
          period_key: budget.periodKey,
          window_start: budget.windowStart,
          window_end: budget.windowEnd,
          workspace: budget.workspace.name,
          workspace_id: budget.workspaceId,
          // For a bounded period the app's actuals include fixed-expense charges forecast to the
          // END of the window (a fresh month already counts the rent), which is what the /budget
          // page shows. Only OPEN budgets cap at today. Expose the fact rather than paper over it —
          // anyone writing an automation on `spent` needs to know.
          forecast_included: budget.periodType !== "OPEN",
          updated_at: publishedAt,
        },
        entities: [
          {
            key: "spent",
            platform: "sensor",
            name: "Spent",
            objectIdSuffix: "spent",
            config: {
              device_class: "monetary",
              // MUST be "total": HA maps the monetary device class to {TOTAL} only, and "total"
              // also reads the drop to 0 at a period rollover as a reset, not a negative delta.
              state_class: "total",
              unit_of_measurement: ctx.currency,
              suggested_display_precision: 2,
              value_template: "{{ value_json.spent }}",
              icon: "mdi:cart-outline",
            },
          },
          {
            key: "target",
            platform: "sensor",
            name: "Target",
            objectIdSuffix: "target",
            config: {
              device_class: "monetary",
              // Deliberately no state_class: a target is a setpoint, and sum statistics over it
              // would be meaningless.
              unit_of_measurement: ctx.currency,
              suggested_display_precision: 2,
              value_template: "{{ value_json.target }}",
              icon: "mdi:target",
            },
          },
          {
            key: "percent",
            platform: "sensor",
            name: "Used",
            objectIdSuffix: "percent",
            config: {
              // Deliberately no device_class: HA has no generic percentage class, and
              // battery/humidity/power_factor would all mis-group the entity. "%" plus
              // measurement is the correct pairing, and this is the entity where long-term
              // statistics actually earn their keep.
              state_class: "measurement",
              unit_of_measurement: "%",
              suggested_display_precision: 0,
              value_template: "{{ value_json.percent }}",
              icon: "mdi:percent-outline",
            },
          },
          {
            key: "over",
            platform: "binary_sensor",
            name: "Over budget",
            objectIdSuffix: "over",
            config: {
              // Renders as OK / Problem and joins HA's problem-entity grouping. payload_on/off are
              // omitted because the template already emits the ON/OFF defaults.
              device_class: "problem",
              value_template: "{{ 'ON' if value_json.over else 'OFF' }}",
            },
          },
        ],
      };
    });
  },
};
