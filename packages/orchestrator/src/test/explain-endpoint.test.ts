import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { createApp } from "../server.js";

const geocoder = new StaticGeocodingProvider({});

test("POST /api/explain returns 503 when ASTROLOGER_ACCESS_CODE is not configured", async () => {
  delete process.env.ASTROLOGER_ACCESS_CODE;
  delete process.env.ANTHROPIC_API_KEY;

  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://localhost:${port}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineResult: {}, concerns: ["career"] }),
    });
    assert.equal(res.status, 503);
  } finally {
    server.close();
  }
});

test("POST /api/explain rejects a missing or wrong access code with 401, never falling through to the LLM call", async () => {
  process.env.ASTROLOGER_ACCESS_CODE = "test-secret-code";
  process.env.ANTHROPIC_API_KEY = "sk-ant-fake-for-test";

  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    // No access code header at all
    const res1 = await fetch(`http://localhost:${port}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineResult: {}, concerns: ["career"] }),
    });
    assert.equal(res1.status, 401);

    // Wrong access code
    const res2 = await fetch(`http://localhost:${port}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": "wrong-code" },
      body: JSON.stringify({ pipelineResult: {}, concerns: ["career"] }),
    });
    assert.equal(res2.status, 401);
  } finally {
    server.close();
    delete process.env.ASTROLOGER_ACCESS_CODE;
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test("POST /api/explain with the correct access code passes the gate and validates the request body next", async () => {
  process.env.ASTROLOGER_ACCESS_CODE = "test-secret-code";
  process.env.ANTHROPIC_API_KEY = "sk-ant-fake-for-test";

  const app = createApp(geocoder);
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    // Correct code, but missing pipelineResult/concerns -> should get
    // past the auth gate and fail on body validation (400), not auth (401).
    const res = await fetch(`http://localhost:${port}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": "test-secret-code" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  } finally {
    server.close();
    delete process.env.ASTROLOGER_ACCESS_CODE;
    delete process.env.ANTHROPIC_API_KEY;
  }
});
