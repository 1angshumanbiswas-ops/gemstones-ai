import { createApp, buildDefaultGeocoder } from "./server.js";

const port = Number(process.env.PORT) || 8080;
const app = createApp(buildDefaultGeocoder());

app.listen(port, () => {
  console.log(`gemstones-ai orchestrator (Phase 1) listening on :${port}`);
});
