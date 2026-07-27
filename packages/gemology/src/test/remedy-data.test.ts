import { test } from "node:test";
import assert from "node:assert/strict";
import { getRemedyProfile } from "../remedy-data.js";

const ALL_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] as const;

test("getRemedyProfile returns a complete remedy profile for every one of the 9 planets", () => {
  for (const planet of ALL_PLANETS) {
    const remedy = getRemedyProfile(planet);
    assert.equal(remedy.planet, planet);
    assert.ok(remedy.deity.length > 0);
    assert.ok(remedy.mantra.length > 0);
    assert.ok(remedy.donationItems.length > 0);
    assert.ok(remedy.fastingDay.length > 0);
  }
});
