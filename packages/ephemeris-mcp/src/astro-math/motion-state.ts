import { planetGeocentricLongitude } from "./planets.js";
import { normalizeDegrees } from "./time.js";
import type { PlanetName } from "@gemstones-ai/shared";

/** Traditional combustion orbs (degrees from the Sun), commonly cited
 *  Vedic gemology/astrology values. Sun and Rahu/Ketu are excluded —
 *  the Sun cannot combust itself, and the nodes are shadow points with
 *  no traditional combustion rule. */
const COMBUSTION_ORB_DEGREES: Partial<Record<PlanetName, number>> = {
  Moon: 12,
  Mars: 17,
  Mercury: 12,
  Jupiter: 11,
  Venus: 8,
  Saturn: 15,
};

/** Detects retrograde motion for the five classical planets by
 *  comparing tropical longitude one day before and after the
 *  reference time — a small, reliable central-difference check. */
export function isRetrograde(planet: string, T: number): boolean {
  const oneDayInCenturies = 1 / 36525;
  const before = planetGeocentricLongitude(planet, T - oneDayInCenturies);
  const after = planetGeocentricLongitude(planet, T + oneDayInCenturies);

  let delta = after - before;
  // handle 0/360 wraparound
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;

  return delta < 0;
}

export function isCombust(
  planet: PlanetName,
  planetTropicalLongitude: number,
  sunTropicalLongitude: number
): boolean {
  const orb = COMBUSTION_ORB_DEGREES[planet];
  if (orb === undefined) return false;

  let diff = normalizeDegrees(planetTropicalLongitude - sunTropicalLongitude);
  if (diff > 180) diff = 360 - diff;
  return diff <= orb;
}
