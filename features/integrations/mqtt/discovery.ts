// Builds Home Assistant MQTT Discovery payloads from the provider-agnostic PublishedObject shape.
//
// Format: DEVICE-BASED discovery (`<discovery_prefix>/device/<object_id>/config`, HA >= 2024.11),
// one config topic per device carrying every entity in a `components` map. Versus the older
// per-entity config topics this means: deleting an object is ONE empty retained publish instead of
// N; adding an entity later is one more key; and `device`/`origin`/`availability`/`state_topic` are
// declared once instead of repeated per entity. That is what keeps adding providers cheap.
//
// Everything transport-level — unique_id, object_id, state_topic, availability, origin, via_device,
// json_attributes_topic — is injected HERE. Providers only describe what an entity means.

import type {PublishedObject} from "@/features/integrations/mqtt/types";
import {
  HUB_OBJECT_ID,
  bridgeStateTopic,
  discoveryObjectId,
  objectStateTopic,
  statusTopic,
} from "@/features/integrations/mqtt/topics";

export type DiscoverySettings = {
  topicPrefix: string;
  appUrl: string;
};

const MANUFACTURER = "BeyondLedger";

function origin() {
  return {name: "BeyondLedger", sw_version: process.env.npm_package_version ?? "0.1.0"};
}

function availability(topicPrefix: string) {
  return [
    {
      topic: statusTopic(topicPrefix),
      payload_available: "online",
      payload_not_available: "offline",
    },
  ];
}

/// The hub. Published FIRST and owns two diagnostic entities of its own — a device with no entities
/// is dropped by HA, and then every `via_device` pointing at it dangles and nothing nests.
export function buildHubDiscovery(settings: DiscoverySettings): Record<string, unknown> {
  const appUrl = settings.appUrl.trim();

  return {
    device: {
      identifiers: [HUB_OBJECT_ID],
      name: "BeyondLedger",
      manufacturer: MANUFACTURER,
      model: "Personal finance",
      ...(appUrl === "" ? {} : {configuration_url: appUrl}),
    },
    origin: origin(),
    state_topic: bridgeStateTopic(settings.topicPrefix),
    availability: availability(settings.topicPrefix),
    qos: 1,
    components: {
      last_publish: {
        platform: "sensor",
        name: "Last publish",
        unique_id: "beyondledger_last_publish",
        object_id: "beyondledger_last_publish",
        // Requires a tz-aware ISO 8601 string, which toISOString() gives us.
        device_class: "timestamp",
        entity_category: "diagnostic",
        value_template: "{{ value_json.last_publish }}",
      },
      objects: {
        platform: "sensor",
        name: "Published objects",
        unique_id: "beyondledger_objects",
        object_id: "beyondledger_objects",
        state_class: "measurement",
        entity_category: "diagnostic",
        icon: "mdi:database-outline",
        value_template: "{{ value_json.objects }}",
      },
    },
  };
}

/// One device per published object, nested under the hub via `via_device`.
export function buildObjectDiscovery(
  providerId: string,
  object: PublishedObject,
  settings: DiscoverySettings,
): Record<string, unknown> {
  const objectId = discoveryObjectId(providerId, object.localId);
  const stateTopic = objectStateTopic(settings.topicPrefix, providerId, object.localId);

  const components: Record<string, unknown> = {};
  for (const entity of object.entities) {
    components[entity.key] = {
      platform: entity.platform,
      name: entity.name,
      // unique_id is the entity-registry key and uses the numeric local id, so it survives a
      // rename. object_id seeds the entity_id and uses the name slug, so automations read
      // sensor.budget_groceries_percent — HA only honours it at FIRST discovery, which is the
      // right trade: renaming a budget must not silently move entity_ids out from under
      // existing automations.
      unique_id: `${objectId}_${entity.key}`,
      object_id: `${object.slug}_${entity.objectIdSuffix}`,
      ...entity.config,
      ...(object.primaryEntityKey === entity.key ? {json_attributes_topic: stateTopic} : {}),
    };
  }

  return {
    device: {
      identifiers: [objectId],
      name: object.deviceName,
      manufacturer: MANUFACTURER,
      model: object.deviceModel,
      via_device: HUB_OBJECT_ID,
    },
    origin: origin(),
    state_topic: stateTopic,
    availability: availability(settings.topicPrefix),
    qos: 1,
    components,
  };
}
