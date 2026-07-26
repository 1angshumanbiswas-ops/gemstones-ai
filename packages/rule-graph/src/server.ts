import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { buildGemstoneShortlist } from "./shortlist.js";

const PLANET_ENUM = z.enum([
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
]);

export function createRuleGraphMcpServer(): McpServer {
  const server = new McpServer({
    name: "gemstones-ai-rule-graph-mcp",
    version: "0.1.0",
  });

  server.tool(
    "shortlist_gemstones",
    "Applies expert-approved traditional rules (ascendant-lord " +
      "strengthening, current-dasha benefic amplification) to shortlist " +
      "candidate gemstones from an ascendant sign and current dasha " +
      "period, then runs the Gemstone Conflict Agent (functional-malefic " +
      "exclusion, natural-enmity caution, Rahu/Ketu simultaneous caution, " +
      "existing-gemstone conflicts, mandatory high-impact-stone human- " +
      "review flags) against them. This is Traditional/rule-graph " +
      "evidence only — no gemology, certification, or consumer-protection " +
      "data (those are separate MCP servers in later phases), and this " +
      "tool never calls an LLM.",
    {
      ascendantSignIndex: z.number().min(1).max(12),
      currentDashaPeriod: z.array(
        z.object({
          lord: PLANET_ENUM,
          startDate: z.string(),
          endDate: z.string(),
          level: z.enum(["mahadasha", "antardasha", "pratyantardasha"]),
          parentLords: z.array(PLANET_ENUM).optional(),
        })
      ),
      existingGemstones: z.array(z.string()).optional(),
    },
    async ({ ascendantSignIndex, currentDashaPeriod, existingGemstones }) => {
      const result = buildGemstoneShortlist({
        ascendantSignIndex,
        currentDashaPeriod: currentDashaPeriod as any,
        existingGemstones: existingGemstones as any,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  return server;
}

export async function startStdioServer(): Promise<void> {
  const server = createRuleGraphMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
