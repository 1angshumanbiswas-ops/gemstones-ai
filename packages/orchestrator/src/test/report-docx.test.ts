import { test } from "node:test";
import assert from "node:assert/strict";
import { StaticGeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "../audit.js";
import { runPipeline } from "../pipeline.js";
import { buildReportDocx } from "../report-docx.js";

const KOLKATA_FIXTURE = new StaticGeocodingProvider({
  Kolkata: {
    latitude: 22.5726,
    longitude: 88.3639,
    resolvedPlaceName: "Kolkata, West Bengal, India",
    matchConfidence: 0.95,
  },
});

test("buildReportDocx produces a well-formed .docx buffer (valid ZIP with the expected internal parts)", async () => {
  const result = await runPipeline(
    {
      dateOfBirth: "1983-05-10",
      timeOfBirth: "13:00",
      timeConfidence: "exact",
      placeOfBirth: "Kolkata",
      existingGemstones: ["Diamond"],
      consent: { givenAt: new Date().toISOString(), purposes: ["chart_calculation"] },
    },
    KOLKATA_FIXTURE,
    new InMemoryAuditSink(),
    new Date("2026-07-26T00:00:00Z")
  );

  const buffer = await buildReportDocx(result);

  // A .docx is a ZIP archive; the local file header signature is "PK\x03\x04".
  assert.equal(buffer[0], 0x50); // 'P'
  assert.equal(buffer[1], 0x4b); // 'K'
  assert.ok(buffer.length > 5000, `expected a substantial document, got ${buffer.length} bytes`);

  // The mandatory OOXML part must be present in the archive's raw bytes.
  const asString = buffer.toString("latin1");
  assert.ok(asString.includes("word/document.xml"), "docx archive should contain word/document.xml");
});

test("buildReportDocx handles an empty gemstone shortlist without throwing", async () => {
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
  // Force an empty surviving list to exercise that branch regardless of
  // what this particular chart naturally produced.
  result.gemstoneShortlist.surviving = [];
  const buffer = await buildReportDocx(result);
  assert.ok(buffer.length > 1000);
});
