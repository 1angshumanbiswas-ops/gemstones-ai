import { test } from "node:test";
import assert from "node:assert/strict";
import { toJulianDay, julianCenturiesSinceJ2000 } from "../astro-math/time.js";
import { sunTropicalLongitude } from "../astro-math/sun.js";
import { buildNatalChart } from "../chart-builder.js";

test("Julian Day for J2000.0 epoch is exactly 2451545.0", () => {
  const jd = toJulianDay(new Date("2000-01-01T12:00:00Z"));
  assert.ok(Math.abs(jd - 2451545.0) < 1e-6, `got ${jd}`);
});

test("Sun's tropical longitude is ~0deg near the March equinox", () => {
  // 2024 March equinox was ~2024-03-20T03:06Z
  const jd = toJulianDay(new Date("2024-03-20T03:06:00Z"));
  const T = julianCenturiesSinceJ2000(jd);
  const lon = sunTropicalLongitude(T);
  // allow a few tenths of a degree given equinox-moment uncertainty
  const distanceFrom0 = Math.min(lon, 360 - lon);
  assert.ok(distanceFrom0 < 1, `expected Sun near 0deg tropical, got ${lon}`);
});

test("Sun's tropical longitude is ~90deg near the June solstice", () => {
  const jd = toJulianDay(new Date("2024-06-20T20:51:00Z"));
  const T = julianCenturiesSinceJ2000(jd);
  const lon = sunTropicalLongitude(T);
  assert.ok(Math.abs(lon - 90) < 1, `expected Sun near 90deg tropical, got ${lon}`);
});

test("buildNatalChart returns all 9 grahas with valid sign indices", () => {
  const chart = buildNatalChart({
    utcDateTime: "1990-04-12T09:02:00Z",
    latitude: 22.5726, // Kolkata
    longitude: 88.3639,
  });

  assert.equal(chart.planets.length, 9);
  for (const p of chart.planets) {
    assert.ok(p.signIndex >= 1 && p.signIndex <= 12, `${p.planet} signIndex out of range`);
    assert.ok(p.degreesInSign >= 0 && p.degreesInSign < 30, `${p.planet} degreesInSign out of range`);
    assert.ok(p.nakshatra.index >= 1 && p.nakshatra.index <= 27, `${p.planet} nakshatra out of range`);
    assert.ok(p.nakshatra.pada >= 1 && p.nakshatra.pada <= 4, `${p.planet} pada out of range`);
  }

  assert.ok(chart.houses.ascendantSignIndex >= 1 && chart.houses.ascendantSignIndex <= 12);
  assert.equal(Object.keys(chart.houses.houseSignIndex).length, 12);
  assert.equal(chart.divisionalCharts.length, 2);
});

test("Ketu is always exactly 180deg from Rahu", () => {
  const chart = buildNatalChart({
    utcDateTime: "2005-11-03T14:15:00Z",
    latitude: 25.5941,
    longitude: 85.1376,
  });
  const rahu = chart.planets.find((p) => p.planet === "Rahu")!;
  const ketu = chart.planets.find((p) => p.planet === "Ketu")!;
  const diff = Math.abs(rahu.siderealLongitude - ketu.siderealLongitude);
  assert.ok(Math.abs(diff - 180) < 1e-6, `expected exactly 180deg apart, got ${diff}`);
});

test("Whole-sign house 7 is always 6 signs from the ascendant", () => {
  const chart = buildNatalChart({
    utcDateTime: "1975-08-01T06:30:00Z",
    latitude: 19.076,
    longitude: 72.8777,
  });
  const asc = chart.houses.ascendantSignIndex;
  const house7 = chart.houses.houseSignIndex[7];
  const expected = ((asc - 1 + 6) % 12) + 1;
  assert.equal(house7, expected);
});
