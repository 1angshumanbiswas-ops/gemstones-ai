import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildNatalChart } from "./chart-builder.js";

export function createEphemerisMcpServer(): McpServer {
  const server = new McpServer({
    name: "gemstones-ai-ephemeris-mcp",
    version: "0.1.0",
  });

  server.tool(
    "calculate_natal_chart",
    "Deterministically calculates a sidereal (Lahiri) natal chart — " +
      "planetary positions, ascendant, whole-sign houses, nakshatras, " +
      "and D9/D10 divisional charts — from a UTC birth instant and " +
      "coordinates. This is the Ephemeris MCP referenced in the " +
      "Gemstones_AI architecture; callers must have already resolved " +
      "local birth time + IANA zone to UTC via the Geo/Timezone MCP " +
      "before calling this tool. Returns pure calculation output — " +
      "no interpretation, no gemstone suggestions.",
    {
      utcDateTime: z
        .string()
        .describe("UTC birth instant, ISO 8601, e.g. 1990-04-12T09:02:00Z"),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    },
    async ({ utcDateTime, latitude, longitude }) => {
      const chart = buildNatalChart({ utcDateTime, latitude, longitude });
      return {
        content: [{ type: "text", text: JSON.stringify(chart, null, 2) }],
      };
    }
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createEphemerisMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
