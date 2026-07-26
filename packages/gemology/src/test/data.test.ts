import { test } from "node:test";
import assert from "node:assert/strict";
import { getGemologyProfile, getAllGemologyProfiles } from "../data.js";

const ALL_GEMSTONES = [
  "Ruby", "Pearl", "Red Coral", "Emerald", "Yellow Sapphire",
  "Diamond", "Blue Sapphire", "Hessonite (Gomed)", "Cat's Eye (Lehsunia)",
] as const;

test("getGemologyProfile returns a complete profile for every one of the 9 traditional gemstones", () => {
  for (const gem of ALL_GEMSTONES) {
    const profile = getGemologyProfile(gem);
    assert.equal(profile.gemstone, gem);
    assert.ok(profile.mineralSpecies.length > 0);
    assert.ok(profile.mohsHardness.length > 0);
    assert.ok(profile.commonTreatments.length > 0);
    assert.ok(profile.durabilityNote.length > 0);
    assert.ok(profile.careInstructions.length > 0);
    assert.ok(["modest", "moderate", "high", "very high"].includes(profile.typicalBudgetTier));
  }
});

test("getAllGemologyProfiles returns exactly 9 profiles, one per gemstone", () => {
  assert.equal(getAllGemologyProfiles().length, 9);
});

test("Diamond and corundum-species stones report Mohs 9-10, consistent with real mineralogy", () => {
  assert.equal(getGemologyProfile("Diamond").mohsHardness, "10");
  assert.equal(getGemologyProfile("Ruby").mohsHardness, "9");
  assert.equal(getGemologyProfile("Blue Sapphire").mohsHardness, "9");
});

test("Pearl and Red Coral (organic gems) report low Mohs hardness, consistent with real mineralogy", () => {
  const pearl = getGemologyProfile("Pearl");
  const coral = getGemologyProfile("Red Coral");
  assert.match(pearl.mohsHardness, /2\.5|3|4/);
  assert.match(coral.mohsHardness, /3|4/);
});
