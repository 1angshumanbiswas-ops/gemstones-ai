import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { GeocodingProvider } from "./geocoding.js";
import { resolveHistoricalTimezone, toUtcIso } from "./timezone.js";

export function createGeoTimezoneMcpServer(
  geocoder: GeocodingProvider
): McpServer {
  const server = new McpServer({
    name: "gemstones-ai-geo-timezone-mcp",
    version: "0.1.0",
  });

  server.tool(
    "resolve_birthplace",
    "Resolves a free-text birthplace (city/town name, as entered by " +
      "the user) into coordinates via a geocoding provider. This is " +
      "the only place in the pipeline that touches the raw place " +
      "string — everything downstream uses coordinates.",
    { placeText: z.string().min(1) },
    async ({ placeText }) => {
      const coords = await geocoder.resolvePlace(placeText);
      return { content: [{ type: "text", text: JSON.stringify(coords, null, 2) }] };
    }
  );

  server.tool(
    "resolve_historical_timezone",
    "Given coordinates and a *local civil* date/time (no zone suffix, " +
      "e.g. 1990-04-12T09:02:00), returns the IANA zone and the actual " +
      "historical UTC offset in effect at that moment — not today's " +
      "offset. Also returns the UTC instant, ready to pass to the " +
      "Ephemeris MCP's calculate_natal_chart tool.",
    {
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      localDateTimeIso: z.string(),
    },
    async ({ latitude, longitude, localDateTimeIso }) => {
      const resolved = resolveHistoricalTimezone(latitude, longitude, localDateTimeIso);
      const utcDateTime = toUtcIso(localDateTimeIso, resolved.ianaZoneId);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ...resolved, utcDateTime }, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

export async function startStdioServer(geocoder: GeocodingProvider): Promise<void> {
  const server = createGeoTimezoneMcpServer(geocoder);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
