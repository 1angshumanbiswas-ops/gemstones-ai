import { test } from "node:test";
import assert from "node:assert/strict";
import { houseSignIndex, housesRuledBy } from "../house-lordship.js";
import { classifyFunctionalNature } from "../functional-nature.js";

test("houseSignIndex: house 1 is always the ascendant sign itself", () => {
  assert.equal(houseSignIndex(5, 1), 5); // Leo ascendant -> house 1 = Leo
});

test("houseSignIndex wraps around the zodiac correctly", () => {
  // Aquarius (11) ascendant, house 4 -> 11+3=14 -> wraps to 2 (Taurus)
  assert.equal(houseSignIndex(11, 4), 2);
});

test("housesRuledBy: Sun rules exactly one house (it owns only Leo)", () => {
  const houses = housesRuledBy("Sun", 1); // Aries ascendant
  assert.equal(houses.length, 1);
  assert.equal(houses[0], 5); // Leo is the 5th house from Aries
});

test("housesRuledBy: Jupiter rules two houses for most ascendants", () => {
  const houses = housesRuledBy("Jupiter", 1); // Aries ascendant: Jupiter owns Sagittarius(9) and Pisces(12)
  assert.deepEqual(houses.sort((a, b) => a - b), [9, 12]);
});

test("housesRuledBy: Rahu/Ketu rule no house in classical Parashari astrology", () => {
  assert.deepEqual(housesRuledBy("Rahu", 5), []);
  assert.deepEqual(housesRuledBy("Ketu", 5), []);
});

test("classifyFunctionalNature: pure lagna lord (rules only house 1) is benefic", () => {
  // Aries ascendant -> Mars rules Aries(1) and Scorpio(8): kendra+trikona? 1 is kendra+trikona itself, 8 is dusthana
  // Use a case where a planet rules ONLY house 1: none of the 7 classical
  // planets rule only house 1 alone except when their second sign also
  // lands on house 1's own... actually house1-only happens for Sun/Moon
  // ascendants matching their own sign. Leo ascendant: Sun rules only Leo = house 1.
  const sunNature = classifyFunctionalNature("Sun", 5); // Leo ascendant
  assert.equal(sunNature.rulesHouses.length, 1);
  assert.equal(sunNature.rulesHouses[0], 1);
  assert.equal(sunNature.disposition, "benefic");
});

test("classifyFunctionalNature: yogakaraka (kendra+trikona) is a strong benefic", () => {
  // Capricorn ascendant (10): Venus rules Taurus(5th house) and Libra(10th house) -> trikona(5)+kendra(10) = yogakaraka
  const venusNature = classifyFunctionalNature("Venus", 10);
  assert.deepEqual(venusNature.rulesHouses.sort((a, b) => a - b), [5, 10]);
  assert.equal(venusNature.disposition, "benefic");
  assert.match(venusNature.reasoning, /yogakaraka/);
});

test("classifyFunctionalNature: dusthana-only lordship (no trikona/kendra mixed in) is malefic", () => {
  // Gemini ascendant(3): Mars rules Aries(house 11) and Scorpio(house 6) —
  // dusthana(6) present, no kendra/trikona in the mix, so this exercises
  // the pure-dusthana branch rather than a mixed/yogakaraka case.
  const marsGemini = classifyFunctionalNature("Mars", 3);
  assert.deepEqual(marsGemini.rulesHouses.sort((a, b) => a - b), [6, 11]);
  assert.equal(marsGemini.disposition, "malefic");
});

test("classifyFunctionalNature: Rahu/Ketu always come back neutral with no houses", () => {
  const rahu = classifyFunctionalNature("Rahu", 7);
  assert.equal(rahu.disposition, "neutral");
  assert.deepEqual(rahu.rulesHouses, []);
});
