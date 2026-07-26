import { test } from "node:test";
import assert from "node:assert/strict";
import { scanForBannedClaims, containsBannedClaims, buildBudgetAdvisory } from "../consumer-protection.js";
import { getGemologyProfile } from "../data.js";

test("scanForBannedClaims catches every Section 12 example phrase", () => {
  assert.ok(containsBannedClaims("This gemstone will recover your ₹14 lakh."));
  assert.ok(containsBannedClaims("Wear this and receive a job within 30 days."));
  assert.ok(containsBannedClaims("This is a 10X energised stone."));
  assert.ok(containsBannedClaims("This stone cures depression."));
  assert.ok(containsBannedClaims("No certificate is necessary because the stone is astrologically powerful."));
});

test("scanForBannedClaims does not flag ordinary safe descriptive text", () => {
  assert.equal(containsBannedClaims("This ruby is heat-treated and rated 9 on the Mohs scale."), false);
  assert.equal(containsBannedClaims("Consider getting a laboratory certificate before purchase."), false);
});

test("scanForBannedClaims returns the specific reason for each match, not just a boolean", () => {
  const matches = scanForBannedClaims("Wear this and receive a job within 30 days.");
  assert.equal(matches.length, 1);
  assert.match(matches[0].reason, /employment/);
});

test("buildBudgetAdvisory returns undefined when no budget was stated", () => {
  const advisory = buildBudgetAdvisory("Diamond", getGemologyProfile("Diamond"), undefined);
  assert.equal(advisory, undefined);
});

test("buildBudgetAdvisory flags high_risk for a budget far below the typical tier", () => {
  const advisory = buildBudgetAdvisory("Diamond", getGemologyProfile("Diamond"), 5000);
  assert.equal(advisory?.riskLevel, "high_risk");
});

test("buildBudgetAdvisory returns none for a budget comfortably within the typical tier", () => {
  const advisory = buildBudgetAdvisory("Hessonite (Gomed)", getGemologyProfile("Hessonite (Gomed)"), 10000);
  assert.equal(advisory?.riskLevel, "none");
});
