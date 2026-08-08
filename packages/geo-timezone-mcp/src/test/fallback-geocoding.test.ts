import { test } from "node:test";
import assert from "node:assert/strict";
import { FallbackGeocodingProvider, type GeocodingProvider } from "../geocoding.js";

function makeProvider(result: "success" | "fail", errorMessage = "provider failed"): GeocodingProvider {
  return {
    async resolvePlace() {
      if (result === "fail") throw new Error(errorMessage);
      return { latitude: 1, longitude: 2, resolvedPlaceName: "Test Place", matchConfidence: 0.9 };
    },
  };
}

test("FallbackGeocodingProvider uses the primary result when it succeeds, never touching the fallback", async () => {
  let fallbackCalled = false;
  const primary = makeProvider("success");
  const fallback: GeocodingProvider = {
    async resolvePlace() {
      fallbackCalled = true;
      throw new Error("should not be called");
    },
  };
  const provider = new FallbackGeocodingProvider(primary, fallback);
  const result = await provider.resolvePlace("Kolkata");
  assert.equal(result.resolvedPlaceName, "Test Place");
  assert.equal(fallbackCalled, false);
});

test("FallbackGeocodingProvider falls back automatically when the primary fails (e.g. 429 rate limit)", async () => {
  const primary = makeProvider("fail", "Geocoding provider returned 429 for \"Kolkata\"");
  const fallback = makeProvider("success");
  const provider = new FallbackGeocodingProvider(primary, fallback);
  const result = await provider.resolvePlace("Kolkata");
  assert.equal(result.resolvedPlaceName, "Test Place");
});

test("FallbackGeocodingProvider surfaces both error messages when primary AND fallback fail", async () => {
  const primary = makeProvider("fail", "primary rate limited");
  const fallback = makeProvider("fail", "fallback also rate limited");
  const provider = new FallbackGeocodingProvider(primary, fallback);
  await assert.rejects(
    () => provider.resolvePlace("Kolkata"),
    (err: Error) => {
      assert.match(err.message, /primary rate limited/);
      assert.match(err.message, /fallback also rate limited/);
      return true;
    }
  );
});
