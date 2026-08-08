#!/usr/bin/env node
export { resolveHistoricalTimezone, toUtcIso } from "./timezone.js";
export { NominatimGeocodingProvider, StaticGeocodingProvider, FallbackGeocodingProvider } from "./geocoding.js";
export type { GeocodingProvider } from "./geocoding.js";
export { createGeoTimezoneMcpServer } from "./server.js";

import { NominatimGeocodingProvider } from "./geocoding.js";
import { startStdioServer } from "./server.js";

const isMain = process.argv[1]?.endsWith("index.js");
if (isMain) {
  const provider = new NominatimGeocodingProvider(
    process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
    process.env.GEOCODING_USER_AGENT ?? "gemstones-ai/0.1 (contact: set GEOCODING_USER_AGENT env var)",
    process.env.GEOCODING_API_KEY
  );
  startStdioServer(provider).catch((err) => {
    console.error("geo-timezone-mcp failed to start:", err);
    process.exit(1);
  });
}
