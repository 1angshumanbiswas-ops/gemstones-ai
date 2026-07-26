import { degreesToRadians, normalizeDegrees } from "./time.js";

/**
 * Apparent geocentric tropical ecliptic longitude of the Sun, degrees.
 * Meeus, "Astronomical Algorithms", ch. 25 (low-precision solar
 * position) — accurate to about 0.01°, far tighter than sign/nakshatra
 * resolution requires.
 */
export function sunTropicalLongitude(T: number): number {
  const L0 = normalizeDegrees(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDegrees(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mrad = degreesToRadians(M);

  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);

  const trueLongitude = L0 + C;

  // Correction for nutation and aberration -> apparent longitude
  const omega = degreesToRadians(125.04 - 1934.136 * T);
  const apparentLongitude =
    trueLongitude - 0.00569 - 0.00478 * Math.sin(omega);

  return normalizeDegrees(apparentLongitude);
}
