// The contract between the MQTT transport and the things it publishes. This is the extensibility
// seam: adding a new kind of Home Assistant entity means writing one EntityProvider and appending
// it to the array in ./providers — no transport, discovery or scheduling code is touched.
//
// A provider returns PublishedObjects. One object = one HA device = one retained discovery topic +
// one retained JSON state topic. Its entities all read that single state doc through different
// value_templates, so a whole object updates atomically in one publish.
//
// NOTE ON LANGUAGE: entity names here are English and hard-coded. next-intl's getTranslations is
// request-scoped (i18n/request.ts builds the config per request), so it cannot be called from a
// background timer; and Home Assistant has its own UI language and its own rename feature anyway.
// Only the settings UI for this feature is localized.

export type EntityPlatform = "sensor" | "binary_sensor";

export type PublishedEntity = {
  /// Key in the discovery payload's `components` map, e.g. "spent". Stable across renames — this
  /// is what lets a component be updated or removed later without guessing.
  key: string;
  platform: EntityPlatform;
  /// Shown in HA under the device, e.g. "Spent".
  name: string;
  /// Appended to the object's slug to form `object_id`, which seeds the entity_id.
  objectIdSuffix: string;
  /// device_class / state_class / unit_of_measurement / value_template / icon / …
  /// Transport-level keys (unique_id, object_id, state_topic, availability) are injected by
  /// discovery.ts — providers must not set them.
  config: Record<string, unknown>;
};

export type PublishedObject = {
  /// Unique within the provider; becomes a topic segment. Numeric ids are ideal: they survive
  /// renames, and the discovery object_id derived from them is the HA entity-registry key.
  localId: string;
  /// Name slug used for `object_id` (and therefore the entity_id a user types into automations).
  /// The provider is responsible for deduplicating slugs within one collected batch.
  slug: string;
  /// HA device name, e.g. "Groceries budget".
  deviceName: string;
  /// HA device model, e.g. "Budget". Groups devices of the same kind in the HA UI.
  deviceModel: string;
  entities: PublishedEntity[];
  /// The JSON document published to the object's state topic. Every entity's value_template reads
  /// from this. Round floats here — unrounded noise churns HA's recorder on every tick.
  state: Record<string, unknown>;
  /// Which entity gets json_attributes_topic. Only one should, or the extra fields are recorded
  /// once per entity.
  primaryEntityKey?: string;
};

export type CollectContext = {
  /// Injected rather than read from the clock inside providers, so one publish cycle is a
  /// consistent snapshot and so payloads can be generated deterministically in a script.
  now: Date;
  /// ISO currency code for monetary entities.
  currency: string;
};

export type EntityProvider = {
  /// Topic segment and discovery-id prefix, e.g. "budget". Must be unique and URL/topic safe.
  id: string;
  collect(ctx: CollectContext): Promise<PublishedObject[]>;
};
