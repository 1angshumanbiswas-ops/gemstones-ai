import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystemPrompt, buildUserContext } from "../prompt.js";
import type { ExplanationContext } from "@gemstones-ai/shared";

test("buildSystemPrompt forbids every category of claim Section 12 names", () => {
  const prompt = buildSystemPrompt();
  assert.match(prompt, /NEVER invent/i);
  assert.match(prompt, /NEVER guarantee/i);
  assert.match(prompt, /NEVER make medical claims/i);
  assert.match(prompt, /energised/i);
  assert.match(prompt, /tool/i);
});

test("buildUserContext includes every planet, the dasha period, and requested concerns", () => {
  const context: ExplanationContext = {
    ascendantSignName: "Leo",
    moonNakshatraName: "Revati",
    planets: [
      { planet: "Sun", siderealLongitude: 25, signIndex: 1, degreesInSign: 25.46, isRetrograde: false, isCombust: false, nakshatra: { name: "Bharani", index: 2, pada: 4 } },
    ],
    currentDashaPeriod: [{ lord: "Moon", startDate: "2023-10-17", endDate: "2033-10-17", level: "mahadasha" }],
    numerology: { mulank: 1, bhagyank: 9, personalYear: 7, personalMonth: 5, compatibleNumbers: [1, 3, 9], referenceDate: "2026-07-26" },
    enrichedCandidates: [],
    transitSnapshot: { referenceDate: "2026-07-26", saturnSignIndex: 12, jupiterSignIndex: 4, rahuSignIndex: 3, ketuSignIndex: 9, sadeSati: { isActive: true, phase: 2 } },
    concerns: ["career", "finance"],
  };

  const text = buildUserContext(context);
  assert.match(text, /Ascendant: Leo/);
  assert.match(text, /Sun: sign index 1/);
  assert.match(text, /mahadasha=Moon/);
  assert.match(text, /Career, Finance/);
});
