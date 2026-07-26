import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nakshatraRuler,
  computeMahadashas,
  computeAntardashas,
  buildDashaTimeline,
  VIMSHOTTARI_YEARS,
  VIMSHOTTARI_ORDER,
} from "../vimshottari.js";
import { computeSadeSati } from "../transits.js";

test("nakshatraRuler cycles through the 9 lords 3 times across 27 nakshatras", () => {
  assert.equal(nakshatraRuler(1), "Ketu"); // Ashwini
  assert.equal(nakshatraRuler(9), "Mercury"); // Ashlesha, end of first cycle
  assert.equal(nakshatraRuler(10), "Ketu"); // Magha, cycle repeats
  assert.equal(nakshatraRuler(27), "Mercury"); // Revati
});

test("computeMahadashas produces exactly 9 periods summing to 120 years from a fresh nakshatra start", () => {
  // Moon at 0deg exactly into Ashwini (Ketu, fraction elapsed = 0)
  const birth = new Date("2000-01-01T00:00:00Z");
  const periods = computeMahadashas(0, birth);
  assert.equal(periods.length, 9);
  assert.equal(periods[0].lord, "Ketu");
  assert.equal(periods[0].startDate, "2000-01-01");

  const totalYears = periods.reduce((sum, p) => {
    const start = new Date(p.startDate).getTime();
    const end = new Date(p.endDate).getTime();
    return sum + (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  }, 0);
  assert.ok(Math.abs(totalYears - 120) < 0.05, `expected ~120 years total, got ${totalYears}`);
});

test("a partial first mahadasha is shorter than the lord's full term", () => {
  // Moon halfway through Ashwini (fraction elapsed = 0.5) -> Ketu's
  // remaining balance should be ~3.5 years, not the full 7.
  const halfwayIntoAshwini = (360 / 27) * 0.5;
  const birth = new Date("2000-01-01T00:00:00Z");
  const periods = computeMahadashas(halfwayIntoAshwini, birth);
  const first = periods[0];
  const years =
    (new Date(first.endDate).getTime() - new Date(first.startDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  assert.ok(Math.abs(years - 3.5) < 0.1, `expected ~3.5 years balance, got ${years}`);
});

test("computeAntardashas subdivides a mahadasha into 9 periods starting with its own lord", () => {
  const mahadasha = {
    lord: "Venus" as const,
    startDate: "2000-01-01",
    endDate: "2020-01-01",
    level: "mahadasha" as const,
  };
  const antardashas = computeAntardashas(mahadasha);
  assert.equal(antardashas.length, 9);
  assert.equal(antardashas[0].lord, "Venus");
  // Venus mahadasha (20yr) x Venus antardasha (20yr) / 120 = 3.333yr
  const firstYears =
    (new Date(antardashas[0].endDate).getTime() - new Date(antardashas[0].startDate).getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  assert.ok(Math.abs(firstYears - (20 * 20) / 120) < 0.05);
});

test("VIMSHOTTARI_YEARS sums to exactly 120", () => {
  const total = VIMSHOTTARI_ORDER.reduce((s, lord) => s + VIMSHOTTARI_YEARS[lord], 0);
  assert.equal(total, 120);
});

test("buildDashaTimeline finds an active mahadasha and antardasha for a mid-cycle reference date", () => {
  const birth = new Date("1990-04-12T00:00:00Z");
  const timeline = buildDashaTimeline(45, birth, new Date("2026-07-26T00:00:00Z"));
  assert.equal(timeline.currentPeriod.length, 2);
  assert.equal(timeline.currentPeriod[0].level, "mahadasha");
  assert.equal(timeline.currentPeriod[1].level, "antardasha");
});

test("computeSadeSati detects phase 2 when transiting Saturn is on the natal Moon sign", () => {
  const status = computeSadeSati(5, 5);
  assert.equal(status.isActive, true);
  assert.equal(status.phase, 2);
});

test("computeSadeSati detects phase 1 (12th from Moon) and phase 3 (2nd from Moon)", () => {
  const phase1 = computeSadeSati(5, 4);
  assert.equal(phase1.phase, 1);
  const phase3 = computeSadeSati(5, 6);
  assert.equal(phase3.phase, 3);
});

test("computeSadeSati reports inactive outside the three relevant signs", () => {
  const status = computeSadeSati(5, 9);
  assert.equal(status.isActive, false);
  assert.equal(status.phase, null);
});
