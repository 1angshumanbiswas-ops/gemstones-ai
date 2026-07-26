#!/usr/bin/env node
export { buildNatalChart } from "./chart-builder.js";
export { createEphemerisMcpServer } from "./server.js";
export * from "./astro-math/time.js";

import { startStdioServer } from "./server.js";

// Only auto-start the stdio MCP transport when this file is executed
// directly (e.g. `node dist/index.js`), not when imported by tests or
// by the orchestrator for in-process use.
const isMain = process.argv[1]?.endsWith("index.js");
if (isMain) {
  startStdioServer().catch((err) => {
    console.error("ephemeris-mcp failed to start:", err);
    process.exit(1);
  });
}
