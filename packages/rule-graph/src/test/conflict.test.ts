import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyAllPlanets } from "../functional-nature.js";
import { generateCandidates, ascendantLordCandidate, currentDashaBeneficCandidate } from "../candidate-generation.js";
import { checkConflicts } from "../conflict.js";
import { buildGemstoneShortlist } from "../shortlist.js";

const ALL_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;

test("ascendantLordCandidate always targets the lagna lord's own gemstone", () => {
  const natures = classifyAllPlanets(5, [...ALL_PLANETS]); // Leo ascendant -> Sun is lagna lord
  const candidate = ascendantLordCandidate(natures);
  assert.ok(candidate);
  assert.equal(candidate!.forPlanet, "Sun");
  assert.equal(candidate!.gemstone, "Ruby");
  assert.equal(candidate!.evidenceLevel, "traditional");
});

test("currentDashaBeneficCandidate only fires for functionally benefic dasha lords", () => {
  const natures = classifyAllPlanets(5, [...ALL_PLANETS]); // Leo ascendant
  // Venus rules Taurus(10th) and Libra(3rd) for Leo ascendant — kendra(10)
  // only, no trikona/dusthana mixed in, so this is genuinely "neutral"
  // (unlike Mars, which is actually a yogakaraka/benefic for Leo — a
  // well-known classical fact, not a neutral case).
  const neutralPeriod = [{ lord: "Venus" as const, startDate: "2020-01-01", endDate: "2027-01-01", level: "mahadasha" as const }];
  assert.equal(currentDashaBeneficCandidate(neutralPeriod, natures).length, 0);

  // Sun (lagna lord, pure house1) IS benefic -> should produce a candidate
  const beneficPeriod = [{ lord: "Sun" as const, startDate: "2020-01-01", endDate: "2026-01-01", level: "mahadasha" as const }];
  const candidates = currentDashaBeneficCandidate(beneficPeriod, natures);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].gemstone, "Ruby");
});

test("generateCandidates de-duplicates when both rules point at the same planet", () => {
  const natures = classifyAllPlanets(5, [...ALL_PLANETS]); // Leo, Sun is lagna lord
  const currentPeriod = [{ lord: "Sun" as const, startDate: "2020-01-01", endDate: "2026-01-01", level: "mahadasha" as const }];
  const candidates = generateCandidates(natures, currentPeriod);
  const rubyCandidates = candidates.filter((c) => c.gemstone === "Ruby");
  assert.equal(rubyCandidates.length, 1); // not double-listed even though both rules fired for Sun
});

test("checkConflicts excludes a functional-malefic candidate", () => {
  const natures = classifyAllPlanets(3, [...ALL_PLANETS]); // Gemini ascendant, Mars is dusthana-only malefic
  const candidates = [
    { gemstone: "Red Coral" as const, forPlanet: "Mars" as const, ruleId: "test", ruleDescription: "test", evidenceLevel: "traditional" as const, riskClassification: "moderate" as const },
  ];
  const result = checkConflicts(candidates, natures);
  assert.equal(result.conflicts.some((c) => c.severity === "excluded" && c.candidateGemstone === "Red Coral"), true);
  assert.equal(result.surviving.length, 0);
});

test("checkConflicts flags natural-enemy pairs as caution without excluding either", () => {
  const natures = classifyAllPlanets(1, [...ALL_PLANETS]); // arbitrary ascendant
  // Sun and Saturn are classical natural enemies
  const candidates = [
    { gemstone: "Ruby" as const, forPlanet: "Sun" as const, ruleId: "t1", ruleDescription: "t", evidenceLevel: "traditional" as const, riskClassification: "moderate" as const },
    { gemstone: "Blue Sapphire" as const, forPlanet: "Saturn" as const, ruleId: "t2", ruleDescription: "t", evidenceLevel: "traditional" as const, riskClassification: "expert_review_required" as const },
  ];
  const result = checkConflicts(candidates, natures);
  const enmityFlag = result.conflicts.find((c) => c.reason.includes("natural enemies"));
  assert.ok(enmityFlag);
  // Neither excluded purely by enmity (only "caution")
  assert.equal(result.surviving.length, 2);
});

test("checkConflicts flags Rahu+Ketu simultaneous candidates with the axis caution", () => {
  const natures = classifyAllPlanets(1, [...ALL_PLANETS]);
  const candidates = [
    { gemstone: "Hessonite (Gomed)" as const, forPlanet: "Rahu" as const, ruleId: "t1", ruleDescription: "t", evidenceLevel: "traditional" as const, riskClassification: "expert_review_required" as const },
    { gemstone: "Cat's Eye (Lehsunia)" as const, forPlanet: "Ketu" as const, ruleId: "t2", ruleDescription: "t", evidenceLevel: "traditional" as const, riskClassification: "expert_review_required" as const },
  ];
  const result = checkConflicts(candidates, natures);
  assert.ok(result.conflicts.some((c) => c.reason.includes("same axis")));
});

test("checkConflicts flags conflicts with an existing worn gemstone", () => {
  const natures = classifyAllPlanets(1, [...ALL_PLANETS]);
  const candidates = [
    { gemstone: "Ruby" as const, forPlanet: "Sun" as const, ruleId: "t1", ruleDescription: "t", evidenceLevel: "traditional" as const, riskClassification: "moderate" as const },
  ];
  // User already wears Diamond (Venus) -- Sun/Venus are natural enemies
  const result = checkConflicts(candidates, natures, ["Diamond"]);
  assert.ok(result.conflicts.some((c) => c.reason.includes("already wear")));
});

test("buildGemstoneShortlist runs the full pipeline end-to-end without throwing", () => {
  const result = buildGemstoneShortlist({
    ascendantSignIndex: 5,
    currentDashaPeriod: [{ lord: "Sun", startDate: "2020-01-01", endDate: "2026-01-01", level: "mahadasha" }],
  });
  assert.ok(result.candidates.length > 0);
  assert.ok(result.functionalNatures.length === 9);
});
