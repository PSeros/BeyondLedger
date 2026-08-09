// Every MQTT topic and identifier the bridge uses, in one pure module. Two namespaces are in play:
// the app's own prefix (default "beyondledger") for state, and Home Assistant's discovery prefix
// (default "homeassistant") for the config topics HA subscribes to.

/// The bridge's LWT topic. Retained "online"/"offline"; every entity's availability points here.
export function statusTopic(prefix: string): string {
  return `${prefix}/status`;
}

/// State for the hub device's diagnostic entities.
export function bridgeStateTopic(prefix: string): string {
  return `${prefix}/bridge/state`;
}

/// Retained list of what we published last, so a fresh process can clean up objects that were
/// deleted while it was down. See publish.ts.
export function indexTopic(prefix: string): string {
  return `${prefix}/bridge/index`;
}

export function objectStateTopic(prefix: string, providerId: string, localId: string): string {
  return `${prefix}/${providerId}/${localId}/state`;
}

/// The HA device identifier — also the discovery topic segment and the unique_id prefix.
export function discoveryObjectId(providerId: string, localId: string): string {
  return `beyondledger_${providerId}_${localId}`;
}

export const HUB_OBJECT_ID = "beyondledger";

/// Device-based discovery (HA >= 2024.11): one config topic carries every entity of one device.
export function objectConfigTopic(discoveryPrefix: string, objectId: string): string {
  return `${discoveryPrefix}/device/${objectId}/config`;
}

/// Lowercase ASCII slug for object_id, which seeds the HA entity_id. German umlauts are
/// transliterated rather than stripped so "Bürobedarf" doesn't collapse to "brobedarf".
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/// Slugs seed entity_ids, so two budgets both named "Urlaub" would otherwise collide and let HA
/// silently append its own "_2". Disambiguate with the stable local id instead, which at least
/// stays put when either budget is renamed.
export function dedupeSlugs<T>(items: T[], slugOf: (item: T) => string, idOf: (item: T) => string): Map<T, string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const slug = slugOf(item);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const result = new Map<T, string>();
  for (const item of items) {
    const slug = slugOf(item);
    const base = slug === "" ? idOf(item) : slug;
    result.set(item, (counts.get(slug) ?? 0) > 1 ? `${base}_${idOf(item)}` : base);
  }
  return result;
}
