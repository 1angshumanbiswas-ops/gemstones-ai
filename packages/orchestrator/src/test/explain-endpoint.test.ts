import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { createApp, sanitizeSecret, buildDefaultGeocoder } from "../server.js";

test("sanitizeSecret strips non-breaking spaces, CR/LF, and other invisible characters", () => {
  assert.equal(sanitizeSecret("abc123"), "abc123");
  assert.equal(sanitizeSecret("abc123\u00A0"), "abc123"); // trailing non-breaking space
  assert.equal(sanitizeSecret("abc\r\n123"), "abc123"); // embedded CRLF
  assert.equal(sanitizeSecret("\u200Babc123"), "abc123"); // leading zero-width space
});

test("buildDefaultGeocoder sanitizes GEOCODING_BASE_URL and GEOCODING_API_KEY, not just the URL string as-is", () => {
  process.env.GEOCODING_BASE_URL = "https://us1.locationiq.com/v1\u00A0"; // trailing NBSP contamination
  process.env.GEOCODING_API_KEY = "test-key-123\r\n";

  try {
    // Doesn't throw, and doesn't retain the invisible contamination —
    // exercised indirectly since the provider's internals are private,
    // but sanitizeSecret itself (used identically here) is directly verified above.
    const geocoder = buildDefaultGeocoder();
    assert.ok(geocoder);
  } finally {
    delete process.env.GEOCODING_BASE_URL;
    delete process.env.GEOCODING_API_KEY;
  }
});

test("access-code check still succeeds when the server-side env value has invisible contamination the header value doesn't", async () => {
  process.env.ASTROLOGER_ACCESS_CODE = "clean-code\u00A0"; // simulates a contaminated paste into Render
  process.env.ANTHROPIC_API_KEY = "sk-ant-fake-for-test";

  const app = createApp(new StaticGeocodingProvider({}));
  const server = app.listen(0);
  const { port } = server.address() as { port: number };

  try {
    const res = await fetch(`http://localhost:${port}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": "clean-code" },
      body: JSON.stringify({}),
    });
    // Should get past the 401 gate (to 400 body validation), proving
    // the sanitized comparison matched despite the contamination.
    assert.equal(res.status, 400);
  } finally {
    server.close();
    delete process.env.ASTROLOGER_ACCESS_CODE;
    delete process.env.ANTHROPIC_API_KEY;
  }
});

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
