import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "../audit.js";
import { runPhase1Pipeline } from "../pipeline.js";

const KOLKATA_FIXTURE = new StaticGeocodingProvider({
  Kolkata: {
    latitude: 22.5726,
    longitude: 88.3639,
    resolvedPlaceName: "Kolkata, West Bengal, India",
    matchConfidence: 0.95,
  },
});

test("runPhase1Pipeline produces a fully-assembled result with a non-empty audit trail", async () => {
  const result = await runPhase1Pipeline(
    {
      dateOfBirth: "1990-04-12",
      timeOfBirth: "09:02",
      timeConfidence: "exact",
      placeOfBirth: "Kolkata",
      consent: { givenAt: new Date().toISOString(), purposes: ["chart_calculation"] },
    },
    KOLKATA_FIXTURE,
    new InMemoryAuditSink(),
    new Date("2026-07-26T00:00:00Z")
  );

  assert.ok(result.requestId);
  assert.equal(result.natalChart.planets.length, 9);
  assert.ok(result.numerology.mulank >= 1 && result.numerology.mulank <= 9);
  assert.ok(result.dashaTimeline.mahadashas.length === 9);
  assert.ok(result.confidence.birthDataConfidence === 1.0); // "exact" time
  assert.ok(result.auditTrail.length >= 5);

  // Every audit entry should carry the same requestId for traceability
  for (const entry of result.auditTrail) {
    assert.equal(entry.requestId, result.requestId);
  }
});

test("approximate birth time confidence is discounted, not treated as exact", async () => {
  const result = await runPhase1Pipeline(
    {
      dateOfBirth: "1990-04-12",
      timeOfBirth: "09:00",
      timeConfidence: "approximate",
      placeOfBirth: "Kolkata",
      consent: { givenAt: new Date().toISOString(), purposes: ["chart_calculation"] },
    },
    KOLKATA_FIXTURE,
    new InMemoryAuditSink(),
    new Date("2026-07-26T00:00:00Z")
  );
  assert.equal(result.confidence.birthDataConfidence, 0.6);
});

test("an unresolvable place surfaces an error rather than silently guessing coordinates", async () => {
  await assert.rejects(() =>
    runPhase1Pipeline(
      {
        dateOfBirth: "1990-04-12",
        timeOfBirth: "09:02",
        timeConfidence: "exact",
        placeOfBirth: "Nowhere Special",
        consent: { givenAt: new Date().toISOString(), purposes: ["chart_calculation"] },
      },
      KOLKATA_FIXTURE,
      new InMemoryAuditSink()
    )
  );
});
