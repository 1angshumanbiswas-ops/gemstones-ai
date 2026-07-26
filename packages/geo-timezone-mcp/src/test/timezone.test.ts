import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveHistoricalTimezone, toUtcIso } from "../timezone.js";

test("resolves Asia/Kolkata for Kolkata coordinates", () => {
  const result = resolveHistoricalTimezone(22.5726, 88.3639, "1990-04-12T09:02:00");
  assert.equal(result.ianaZoneId, "Asia/Kolkata");
  assert.equal(result.utcOffsetMinutes, 330); // IST, UTC+5:30, stable since 1945
});

test("flags a pre-standardization Kolkata birth as historical-rule offset", () => {
  // Before India Standard Time was adopted (1 Sept 1942), Kolkata ran on
  // local mean/Madras-derived time, not UTC+5:30.
  const result = resolveHistoricalTimezone(22.5726, 88.3639, "1900-06-15T09:02:00");
  assert.equal(result.ianaZoneId, "Asia/Kolkata");
  assert.notEqual(result.utcOffsetMinutes, 330);
  assert.equal(result.isHistoricalRule, true);
});

test("toUtcIso converts local civil time + zone into a correct UTC instant", () => {
  const utc = toUtcIso("1990-04-12T09:02:00", "Asia/Kolkata");
  // 09:02 IST (UTC+5:30) -> 03:32 UTC same day
  assert.equal(utc, "1990-04-12T03:32:00Z");
});

test("resolves a Western DST-observing zone correctly across summer/winter", () => {
  const summer = resolveHistoricalTimezone(40.7128, -74.006, "2023-07-01T12:00:00"); // NYC
  const winter = resolveHistoricalTimezone(40.7128, -74.006, "2023-01-01T12:00:00");
  assert.equal(summer.ianaZoneId, "America/New_York");
  assert.equal(summer.utcOffsetMinutes, -240); // EDT, UTC-4
  assert.equal(winter.utcOffsetMinutes, -300); // EST, UTC-5
});
