// Next runs register() exactly once per server process, at boot, before the first request — and
// skips it entirely during `next build`. It is the only place in this app where code runs outside a
// request, which is what the Home Assistant MQTT bridge needs.
//
// Two things here are load-bearing:
//
//   - The bridge start is NOT awaited. Next awaits register() before opening the HTTP listener, so
//     awaiting a connection to an unreachable broker would delay the whole app's startup.
//   - The .catch() is mandatory, not decorative. Node throws on unhandled rejections, which would
//     kill the systemd unit and have it restart-loop every RestartSec.
//
// Dev caveat: editing this file, or anything in its import graph, does NOT hot-reload — the
// register promise is already resolved. Restart `npm run dev` to pick bridge changes up.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const {startMqttBridge} = await import("@/features/integrations/mqtt/bridge");
  void startMqttBridge().catch((error: unknown) => {
    console.error("[mqtt] bridge failed to start", error);
  });
}
