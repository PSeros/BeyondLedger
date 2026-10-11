import {BREAKDOWN_DIMENSIONS, STAT_UNITS, type BreakdownDimension, type InsightsDomain, type StatUnit} from "@/features/insights/params";

// Domain-aware labels for the stats unit (?u) and the grouping (?by): "Beleg" for expenses, "Zahlung"
// for income, "Buchung" for savings; "Lieferant" vs "Quelle"; a pot ("Sparziel") is both category and
// counterparty of a saving. Pure and client-safe; returns `insights.*` message keys.

// Line items only exist on bills.
export const unitsFor = (domain: InsightsDomain): readonly StatUnit[] =>
  domain === "income" || domain === "saving" ? STAT_UNITS.filter((unit) => unit !== "item") : STAT_UNITS;

// For savings, counterparty and category are the same thing (the pot), so only category is offered.
export const dimensionsFor = (domain: InsightsDomain): readonly BreakdownDimension[] =>
  domain === "saving" ? BREAKDOWN_DIMENSIONS.filter((dimension) => dimension !== "counterparty") : BREAKDOWN_DIMENSIONS;

export function unitKey(unit: StatUnit, domain: InsightsDomain): string {
  return unit === "bill" ? `unitBill.${domain}` : `unit.${unit}`;
}

// Capitalized label (selects, column headers).
export function dimensionKey(dimension: BreakdownDimension, domain: InsightsDomain): string {
  if (domain === "saving" && (dimension === "category" || dimension === "counterparty")) return "byTarget";
  if (dimension === "counterparty") return `byCounterpartyIn.${domain}`;
  return {weekday: "boxByWeekday", category: "byCategory", tag: "byTag"}[dimension];
}

// Lower-case form for running text ("Anteil nach Kategorie").
export function groupKey(dimension: BreakdownDimension, domain: InsightsDomain): string {
  if (domain === "saving" && (dimension === "category" || dimension === "counterparty")) return "groupTarget";
  if (dimension === "counterparty") return `groupCounterpartyIn.${domain}`;
  return `group.${dimension}`;
}
