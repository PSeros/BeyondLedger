import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // MQTT.js ships browser conditional exports (a WebSocket-only build) and optional native deps
  // (bufferutil/utf-8-validate), so bundling it picks the wrong entry. Unlike better-sqlite3 it is
  // NOT in Next's built-in server-external-packages list, so it has to be named here. Externalizing
  // also guarantees the instrumentation bundle and the route/action bundles share one copy.
  serverExternalPackages: ["mqtt"],
};

export default withNextIntl(nextConfig);
