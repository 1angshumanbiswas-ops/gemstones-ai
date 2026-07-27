import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { createApp } from "../server.js";

const geocoder = new StaticGeocodingProvider({});

test("POST /api/certificate/check returns a non-verifying result with a real GIA deep link", async () => {
  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://localhost:${port}/api/certificate/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laboratory: "gia", reportNumber: "2141438155" }),
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.status, "not_verified_by_this_app");
    assert.ok(body.reportCheckUrl.includes("gia.edu/report-check"));
  } finally {
    server.close();
  }
});

test("POST /api/certificate/check rejects a request missing required fields", async () => {
  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://localhost:${port}/api/certificate/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laboratory: "gia" }),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
  }
});

test("GET /healthz reports phase 4", async () => {
  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://localhost:${port}/healthz`);
    const body = await res.json();
    assert.equal(body.phase, 4);
  } finally {
    server.close();
  }
});
