import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "../audit.js";
import { runPipeline } from "../pipeline.js";

const KOLKATA_FIXTURE = new StaticGeocodingProvider({
  Kolkata: {
    latitude: 22.5726,
    longitude: 88.3639,
    resolvedPlaceName: "Kolkata, West Bengal, India",
    matchConfidence: 0.95,
  },
});

test("runPipeline produces a fully-assembled result with a non-empty audit trail", async () => {
  const result = await runPipeline(
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
  assert.ok(result.auditTrail.length >= 7); // 5 Phase 1 steps + rule_evaluation + conflict_check

  // Phase 2: rule-graph shortlist should have run and produced at
  // least the ascendant-lord candidate, with functional natures for
  // all 9 grahas attached.
  assert.equal(result.functionalNatures.length, 9);
  assert.ok(result.gemstoneShortlist.candidates.length > 0);
  assert.ok(
    result.auditTrail.some((e) => e.step === "rule_evaluation") &&
      result.auditTrail.some((e) => e.step === "conflict_check")
  );

  // Every audit entry should carry the same requestId for traceability
  for (const entry of result.auditTrail) {
    assert.equal(entry.requestId, result.requestId);
  }
});

test("approximate birth time confidence is discounted, not treated as exact", async () => {
  const result = await runPipeline(
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

test("existingGemstones on the birth input flows through to the conflict check", async () => {
  const result = await runPipeline(
    {
      dateOfBirth: "1990-04-12",
      timeOfBirth: "09:02",
      timeConfidence: "exact",
      placeOfBirth: "Kolkata",
      existingGemstones: ["Diamond"],
      consent: { givenAt: new Date().toISOString(), purposes: ["chart_calculation"] },
    },
    KOLKATA_FIXTURE,
    new InMemoryAuditSink(),
    new Date("2026-07-26T00:00:00Z")
  );
  const conflictAudit = result.auditTrail.find((e) => e.step === "conflict_check");
  assert.deepEqual(conflictAudit?.inputSummary.existingGemstones, ["Diamond"]);
});

test("an unresolvable place surfaces an error rather than silently guessing coordinates", async () => {
  await assert.rejects(() =>
    runPipeline(
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
