// One publish cycle: collect from every provider, build discovery + state payloads, write them,
// and clean up whatever disappeared since last time.
//
// The transport is behind a Publisher port so this whole file runs — and its payloads can be
// inspected — without a broker or an `mqtt` import anywhere in the graph.

import {buildHubDiscovery, buildObjectDiscovery} from "@/features/integrations/mqtt/discovery";
import {providers} from "@/features/integrations/mqtt/providers";
import {
  HUB_OBJECT_ID,
  bridgeStateTopic,
  discoveryObjectId,
  indexTopic,
  objectConfigTopic,
  objectStateTopic,
} from "@/features/integrations/mqtt/topics";
import type {CollectContext} from "@/features/integrations/mqtt/types";

export type PublishSettings = {
  topicPrefix: string;
  discoveryPrefix: string;
  currency: string;
  appUrl: string;
};

export type Publisher = {
  publish(topic: string, payload: string, options: {retain: boolean; qos: 0 | 1}): Promise<void>;
};

/// One entry per published object. The TOPICS are stored, not just ids, so that a future change to
/// the topic scheme or the discovery format can still clean up objects written by the old one — an
/// id alone would strand them on the broker forever.
export type IndexEntry = {
  id: string;
  configTopic: string;
  stateTopic: string;
};

export type PublishIndex = {
  version: number;
  objects: IndexEntry[];
};

export const INDEX_VERSION = 1;

export type PublishResult = {
  objectCount: number;
  removedCount: number;
  publishedAt: string;
};

const RETAINED = {retain: true, qos: 1} as const;

export function parseIndex(raw: string): IndexEntry[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return null;
    const objects = (parsed as {objects?: unknown}).objects;
    if (!Array.isArray(objects)) return null;
    return objects.filter(
      (entry): entry is IndexEntry =>
        entry !== null &&
        typeof entry === "object" &&
        typeof (entry as IndexEntry).id === "string" &&
        typeof (entry as IndexEntry).configTopic === "string" &&
        typeof (entry as IndexEntry).stateTopic === "string",
    );
  } catch {
    return null;
  }
}

/// Collect → publish → reconcile. `previous` is the index from the last cycle (or the retained one
/// read at startup); pass null when nothing is known and no cleanup should be attempted.
export async function publishAll(
  pub: Publisher,
  settings: PublishSettings,
  previous: IndexEntry[] | null,
  now: Date = new Date(),
): Promise<{result: PublishResult; index: IndexEntry[]}> {
  const ctx: CollectContext = {now, currency: settings.currency};
  const publishedAt = now.toISOString();
  const index: IndexEntry[] = [];

  // The hub goes out before anything that points at it with via_device, or the nesting dangles.
  await pub.publish(
    objectConfigTopic(settings.discoveryPrefix, HUB_OBJECT_ID),
    JSON.stringify(buildHubDiscovery(settings)),
    RETAINED,
  );

  for (const provider of providers) {
    const objects = await provider.collect(ctx);
    for (const object of objects) {
      const configTopic = objectConfigTopic(
        settings.discoveryPrefix,
        discoveryObjectId(provider.id, object.localId),
      );
      const stateTopic = objectStateTopic(settings.topicPrefix, provider.id, object.localId);

      await pub.publish(
        configTopic,
        JSON.stringify(buildObjectDiscovery(provider.id, object, settings)),
        RETAINED,
      );
      await pub.publish(stateTopic, JSON.stringify(object.state), RETAINED);

      index.push({id: `${provider.id}:${object.localId}`, configTopic, stateTopic});
    }
  }

  // Anything we published before and didn't publish now is gone. An empty retained payload on the
  // config topic is how HA is told to drop a device; without it the entity lingers forever.
  let removedCount = 0;
  if (previous !== null) {
    const live = new Set(index.map((entry) => entry.id));
    for (const entry of previous) {
      if (live.has(entry.id)) continue;
      await pub.publish(entry.configTopic, "", RETAINED);
      await pub.publish(entry.stateTopic, "", RETAINED);
      removedCount += 1;
    }
  }

  await pub.publish(
    bridgeStateTopic(settings.topicPrefix),
    JSON.stringify({last_publish: publishedAt, objects: index.length}),
    RETAINED,
  );

  const nextIndex: PublishIndex = {version: INDEX_VERSION, objects: index};
  await pub.publish(indexTopic(settings.topicPrefix), JSON.stringify(nextIndex), RETAINED);

  return {result: {objectCount: index.length, removedCount, publishedAt}, index};
}
