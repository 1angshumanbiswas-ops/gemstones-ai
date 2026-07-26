#!/usr/bin/env node
export * from "./house-lordship.js";
export * from "./functional-nature.js";
export * from "./planetary-friendship.js";
export * from "./candidate-generation.js";
export * from "./conflict.js";
export * from "./shortlist.js";
export { createRuleGraphMcpServer } from "./server.js";

import { startStdioServer } from "./server.js";

const isMain = process.argv[1]?.endsWith("index.js");
if (isMain) {
  startStdioServer().catch((err) => {
    console.error("rule-graph-mcp failed to start:", err);
    process.exit(1);
  });
}
