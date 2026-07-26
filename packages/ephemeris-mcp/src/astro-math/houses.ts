import { degreesToRadians, normalizeDegrees, radiansToDegrees } from "./time.js";

/** Mean obliquity of the ecliptic, degrees (Meeus 22.2, arcsecond terms
 *  folded into degrees). */
export function meanObliquity(T: number): number {
  const seconds =
    21.448 - 46.815 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return 23 + 26 / 60 + seconds / 3600;
}

/** Greenwich Mean Sidereal Time, degrees. */
export function greenwichMeanSiderealTime(jd: number, T: number): number {
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return normalizeDegrees(gmst);
}

/**
 * Tropical ecliptic longitude of the ascendant, degrees.
 * `longitudeDeg` is east-positive geographic longitude.
 */
export function ascendantTropicalLongitude(
  jd: number,
  T: number,
  latitudeDeg: number,
  longitudeDeg: number
): number {
  const gmst = greenwichMeanSiderealTime(jd, T);
  const ramc = normalizeDegrees(gmst + longitudeDeg); // local sidereal time as an angle
  const ramcRad = degreesToRadians(ramc);
  const eps = degreesToRadians(meanObliquity(T));
  const phi = degreesToRadians(latitudeDeg);

  const y = Math.cos(ramcRad);
  const x = -(Math.sin(ramcRad) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));

  return normalizeDegrees(radiansToDegrees(Math.atan2(y, x)));
}

export interface HouseResult {
  ascendantSignIndex: number; // 1-12
  houseSignIndex: Record<number, number>; // house 1-12 -> sign index
}

/** Whole-sign house system: house N occupies the same sign that is N-1
 *  signs after the ascendant's sign. This is the house system most
 *  Vedic gemstone rule sets (Section 7's Rule-Graph MCP) assume. */
export function wholeSignHouses(ascendantSignIndex: number): HouseResult {
  const houseSignIndex: Record<number, number> = {};
  for (let house = 1; house <= 12; house++) {
    houseSignIndex[house] = (((ascendantSignIndex - 1 + (house - 1)) % 12) + 12) % 12 + 1;
  }
  return { ascendantSignIndex, houseSignIndex };
}
