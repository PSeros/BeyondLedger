// The handle onto the running MQTT bridge, and the ONLY module the rest of the app imports to talk
// to it. Two things make this file exist:
//
// 1. globalThis, not module scope. instrumentation.ts (which starts the bridge) is compiled as its
//    own bundle graph, separate from the route/action bundles. Module-level state is therefore NOT
//    shared: a `let bridge` here would hand every server action a second, empty slot and nudge()
//    would silently do nothing. Same reasoning as lib/prisma.ts. The process IS shared — next start
//    runs actions in-process, no render workers — so a global genuinely reaches the bridge.
//
// 2. No `mqtt` import, anywhere in this file's graph. Mutations import nudge(); if that dragged in
//    the mqtt client, it would land in every server-action bundle.

export type MqttBridgeStatus = {
  running: boolean;
  connected: boolean;
  brokerHost: string;
  lastPublishAt: string | null;
  lastError: string | null;
  objectCount: number;
};

export type BridgeHandle = {
  nudge(reason: string): void;
  stop(): Promise<void>;
  status(): MqttBridgeStatus;
};

const OFF: MqttBridgeStatus = {
  running: false,
  connected: false,
  brokerHost: "",
  lastPublishAt: null,
  lastError: null,
  objectCount: 0,
};

const slot = globalThis as unknown as {
  beyondledgerMqttBridge?: BridgeHandle;
};

export function installBridge(handle: BridgeHandle): void {
  slot.beyondledgerMqttBridge = handle;
}

export function clearBridge(): void {
  slot.beyondledgerMqttBridge = undefined;
}

export function currentBridge(): BridgeHandle | undefined {
  return slot.beyondledgerMqttBridge;
}

/// Ask for a publish soon. Synchronous, returns void, and CANNOT throw — a mutation must never fail
/// because a broker is unreachable or the bridge is switched off. No bridge installed = no-op.
export function nudge(reason: string): void {
  try {
    slot.beyondledgerMqttBridge?.nudge(reason);
  } catch (error) {
    console.error("[mqtt] nudge failed", error);
  }
}

/// Client-safe snapshot for the settings page.
export function getMqttBridgeStatus(): MqttBridgeStatus {
  try {
    return slot.beyondledgerMqttBridge?.status() ?? OFF;
  } catch {
    return OFF;
  }
}
