// The live MQTT connection. The ONLY module in the app that imports `mqtt` — everything else talks
// to it through runtime.ts (nudge/status) or through the pure publish.ts.
//
// Lifecycle: instrumentation.ts starts it once per process at boot; saving the settings form
// restarts it. It publishes on connect, on a slow interval, and on a debounced nudge from any
// mutation that can move a budget's actuals.
//
// Robustness rules this file exists to enforce:
//   - Reading settings, connecting, and publishing can all fail without affecting the app. A broker
//     that is down must never break a page render or a mutation.
//   - Nothing here may throw into a timer callback or leave a promise rejection floating; either
//     kills the process, and systemd would just restart-loop it.
//   - No graceful "publish offline then disconnect" on shutdown. It is a race against Next's own
//     SIGTERM handler (which ends in process.exit) that we would lose, AND a clean MQTT DISCONNECT
//     suppresses the will. The LWT covers every death — SIGTERM, kill -9, the deliberate
//     process.exit(0) in /api/restore, a pulled cable — with no shutdown code at all.

import mqtt from "mqtt";
import type {MqttClient} from "mqtt";
import {clampPublishInterval, getMqttSettings} from "@/features/integrations/db/mqttSettings";
import type {MqttSettings} from "@/features/integrations/db/mqttSettings";
import {publishAll, parseIndex} from "@/features/integrations/mqtt/publish";
import type {IndexEntry, PublishSettings} from "@/features/integrations/mqtt/publish";
import {clearBridge, currentBridge, installBridge} from "@/features/integrations/mqtt/runtime";
import type {MqttBridgeStatus} from "@/features/integrations/mqtt/runtime";
import {indexTopic, statusTopic} from "@/features/integrations/mqtt/topics";

const NUDGE_DEBOUNCE_MS = 1500;
const INDEX_READ_TIMEOUT_MS = 2000;
const CONNECT_TIMEOUT_MS = 10_000;
const TEST_TIMEOUT_MS = 8000;

export type MqttConnectionConfig = Pick<
  MqttSettings,
  "host" | "port" | "useTls" | "username" | "password" | "clientId"
>;

function brokerUrl(config: MqttConnectionConfig): string {
  return `${config.useTls ? "mqtts" : "mqtt"}://${config.host.trim()}:${config.port}`;
}

function connectOptions(config: MqttConnectionConfig, willTopic: string): mqtt.IClientOptions {
  const username = config.username.trim();

  return {
    // A stable clientId with a random suffix: stable enough to read in broker logs, unique enough
    // that a restart racing the old session's keepalive isn't kicked off by its own ghost.
    clientId: `${config.clientId.trim() || "beyondledger"}_${Math.random().toString(16).slice(2, 8)}`,
    ...(username === "" ? {} : {username, password: config.password}),
    clean: true,
    keepalive: 60,
    connectTimeout: CONNECT_TIMEOUT_MS,
    // The 1s default hammers a LAN broker that is rebooting.
    reconnectPeriod: 10_000,
    // Don't let MQTT.js buffer while offline — its outgoing store is unbounded, and one publish
    // per interval over a weekend outage is a slow leak. We republish everything on connect
    // anyway, so skipped cycles cost nothing.
    queueQoSZero: false,
    will: {topic: willTopic, payload: Buffer.from("offline"), retain: true, qos: 1},
  };
}

function publishSettingsOf(settings: MqttSettings): PublishSettings {
  return {
    topicPrefix: settings.topicPrefix,
    discoveryPrefix: settings.discoveryPrefix,
    currency: settings.currency,
    appUrl: settings.appUrl,
  };
}

/// Reads the retained index one time at startup, so a process that was down while a budget got
/// deleted can still remove its ghost entity. No retained message within the timeout simply means
/// "no prior run" — the caller then skips cleanup rather than guessing.
function readRetainedIndex(client: MqttClient, topic: string): Promise<IndexEntry[] | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: IndexEntry[] | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.off("message", onMessage);
      client.unsubscribe(topic, () => {});
      resolve(value);
    };

    const onMessage = (received: string, payload: Buffer) => {
      if (received !== topic) return;
      const raw = payload.toString();
      finish(raw === "" ? null : parseIndex(raw));
    };

    const timer = setTimeout(() => finish(null), INDEX_READ_TIMEOUT_MS);
    client.on("message", onMessage);
    client.subscribe(topic, {qos: 1}, (error) => {
      if (error) finish(null);
    });
  });
}

export async function startMqttBridge(): Promise<void> {
  // Tear down whatever a previous start left behind (dev restarts, a settings save) so timers and
  // sockets can never accumulate.
  await stopMqttBridge();

  let settings: MqttSettings;
  try {
    settings = await getMqttSettings();
  } catch (error) {
    // A missing table is expected right after restoring an older backup, before migrate deploy has
    // run. Degrade to "bridge off"; never take the app down with us.
    console.error("[mqtt] could not read settings — bridge stays off", error);
    return;
  }

  if (!settings.enabled || settings.host.trim() === "") return;

  const willTopic = statusTopic(settings.topicPrefix);
  const client = mqtt.connect(brokerUrl(settings), connectOptions(settings, willTopic));
  const intervalMs = clampPublishInterval(settings.publishIntervalSeconds) * 1000;

  let index: IndexEntry[] | null = null;
  let readIndexOnce = false;
  let publishing = false;
  let dirty = false;
  let debounce: NodeJS.Timeout | undefined;
  let lastPublishAt: string | null = null;
  let lastError: string | null = null;
  let objectCount = 0;
  let stopped = false;

  const publisher = {
    async publish(topic: string, payload: string, options: {retain: boolean; qos: 0 | 1}) {
      // Never hand a payload to a disconnected client — see queueQoSZero above.
      if (!client.connected) return;
      await client.publishAsync(topic, payload, options);
    },
  };

  async function runPublish(): Promise<void> {
    if (stopped || !client.connected) return;
    if (publishing) {
      // A nudge landed mid-cycle; the data it refers to may not have been read yet.
      dirty = true;
      return;
    }

    publishing = true;
    try {
      if (!readIndexOnce) {
        index = await readRetainedIndex(client, indexTopic(settings.topicPrefix));
        readIndexOnce = true;
      }
      const {result, index: nextIndex} = await publishAll(publisher, publishSettingsOf(settings), index);
      index = nextIndex;
      lastPublishAt = result.publishedAt;
      objectCount = result.objectCount;
      lastError = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error("[mqtt] publish failed", error);
    } finally {
      publishing = false;
      if (dirty && !stopped) {
        dirty = false;
        void runPublish();
      }
    }
  }

  client.on("connect", () => {
    lastError = null;
    // Retained messages — including every discovery config — are lost when a broker restarts, so
    // republish on EVERY connect, not just the first.
    void client.publishAsync(willTopic, "online", {retain: true, qos: 1}).then(
      () => runPublish(),
      (error: unknown) => console.error("[mqtt] could not announce availability", error),
    );
  });

  client.on("error", (error) => {
    // An mqtt client with no error listener throws uncaught. MQTT.js reconnects on its own.
    lastError = error instanceof Error ? error.message : String(error);
    console.error("[mqtt] client error", error);
  });

  client.on("close", () => {
    // Force a fresh index read after a reconnect: the broker may have been replaced.
    readIndexOnce = false;
  });

  const timer = setInterval(() => {
    // A throw inside a timer callback is an uncaught exception; runPublish already swallows, but
    // the void+catch here is the belt to that suspenders.
    void runPublish().catch((error: unknown) => console.error("[mqtt] tick failed", error));
  }, intervalMs);
  // Never keep the process alive on our account.
  timer.unref();

  const handle = {
    nudge(reason: string) {
      if (stopped) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = undefined;
        void runPublish().catch((error: unknown) => console.error(`[mqtt] nudge (${reason}) failed`, error));
      }, NUDGE_DEBOUNCE_MS);
      debounce.unref();
    },

    async stop() {
      stopped = true;
      clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      // force: true skips the DISCONNECT packet, so the broker still fires our will and Home
      // Assistant sees the entities go unavailable.
      await client.endAsync(true).catch(() => {});
    },

    status(): MqttBridgeStatus {
      return {
        running: !stopped,
        connected: client.connected,
        brokerHost: `${settings.host}:${settings.port}`,
        lastPublishAt,
        lastError,
        objectCount,
      };
    },
  };

  installBridge(handle);

  // Tidiness only — correctness rests on the LWT, since Next's own SIGTERM handler calls
  // process.exit and will usually get there first.
  process.once("SIGTERM", () => void handle.stop());
  process.once("SIGINT", () => void handle.stop());
}

export async function stopMqttBridge(): Promise<void> {
  const existing = currentBridge();
  if (!existing) return;
  clearBridge();
  try {
    await existing.stop();
  } catch (error) {
    console.error("[mqtt] stop failed", error);
  }
}

export async function restartMqttBridge(): Promise<void> {
  await startMqttBridge();
}

/// Used by the settings page's "Test connection" button. Accepts typed-but-unsaved values and never
/// throws — it reports, it doesn't fail.
export async function testMqttConnection(
  config: MqttConnectionConfig,
): Promise<{ok: boolean; message: string}> {
  if (config.host.trim() === "") {
    return {ok: false, message: "No broker host set — enter one above first."};
  }

  return new Promise((resolve) => {
    let settled = false;
    const client = mqtt.connect(brokerUrl(config), {
      ...connectOptions(config, `${config.clientId.trim() || "beyondledger"}/test`),
      // One shot: don't sit there retrying behind a spinner.
      reconnectPeriod: 0,
      connectTimeout: TEST_TIMEOUT_MS,
    });

    const finish = (result: {ok: boolean; message: string}) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void client.endAsync(true).catch(() => {});
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ok: false, message: "Connection timed out — check the host and port."}),
      TEST_TIMEOUT_MS,
    );

    client.on("connect", () => finish({ok: true, message: "Connected to the broker."}));

    client.on("error", (error) => {
      // MQTT.js reports protocol-level refusals as a numeric CONNACK code (4 = bad username or
      // password, 5 = not authorized) and socket-level failures as the usual string errno codes.
      const code: unknown = (error as {code?: unknown}).code;

      if (code === 4 || code === 5) {
        finish({ok: false, message: "Broker rejected the credentials."});
        return;
      }
      if (code === "ECONNREFUSED") {
        finish({ok: false, message: "Connection refused — is the broker listening on that port?"});
        return;
      }
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
        finish({ok: false, message: "Host not found — check the broker address."});
        return;
      }
      finish({ok: false, message: `Could not reach the broker: ${error.message}`});
    });
  });
}
