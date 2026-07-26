import { degreesToRadians, normalizeDegrees } from "./time.js";

interface LongitudeTerm {
  d: number;
  m: number;
  mp: number;
  f: number;
  coeff: number; // degrees
}

// Truncated from Meeus ch. 47's 60-term ELP2000-derived series, keeping
// the ~19 largest-amplitude terms. Residual error is on the order of a
// few arcminutes — comfortably inside nakshatra (13.33°) and even most
// pada (3.33°) resolution for Phase 1 purposes.
const LONGITUDE_TERMS: LongitudeTerm[] = [
  { d: 0, m: 0, mp: 1, f: 0, coeff: 6.288774 },
  { d: 2, m: 0, mp: -1, f: 0, coeff: 1.274027 },
  { d: 2, m: 0, mp: 0, f: 0, coeff: 0.658314 },
  { d: 0, m: 0, mp: 2, f: 0, coeff: 0.213618 },
  { d: 0, m: 1, mp: 0, f: 0, coeff: -0.185116 },
  { d: 0, m: 0, mp: 0, f: 2, coeff: -0.114332 },
  { d: 2, m: 0, mp: -2, f: 0, coeff: 0.058793 },
  { d: 2, m: -1, mp: -1, f: 0, coeff: 0.057066 },
  { d: 2, m: 0, mp: 1, f: 0, coeff: 0.05332 },
  { d: 2, m: -1, mp: 0, f: 0, coeff: 0.045758 },
  { d: 0, m: 1, mp: -1, f: 0, coeff: -0.040923 },
  { d: 1, m: 0, mp: 0, f: 0, coeff: -0.03472 },
  { d: 0, m: 1, mp: 1, f: 0, coeff: -0.030383 },
  { d: 2, m: 0, mp: 0, f: -2, coeff: 0.015327 },
  { d: 0, m: 0, mp: 1, f: 2, coeff: -0.012528 },
  { d: 0, m: 0, mp: 1, f: -2, coeff: 0.01098 },
  { d: 4, m: 0, mp: -1, f: 0, coeff: 0.010675 },
  { d: 0, m: 0, mp: 3, f: 0, coeff: 0.010034 },
  { d: 4, m: 0, mp: -2, f: 0, coeff: 0.008548 },
];

/** Mean lunar orbital arguments (degrees) at Julian century T from J2000. */
export function moonMeanArguments(T: number) {
  const Lp = normalizeDegrees(
    218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      (T * T * T) / 538841 -
      (T * T * T * T) / 65194000
  );
  const D = normalizeDegrees(
    297.8501921 +
      445267.1114034 * T -
      0.0018819 * T * T +
      (T * T * T) / 545868 -
      (T * T * T * T) / 113065000
  );
  const M = normalizeDegrees(
    357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000
  );
  const Mp = normalizeDegrees(
    134.9633964 +
      477198.8675055 * T +
      0.0087414 * T * T +
      (T * T * T) / 69699 -
      (T * T * T * T) / 14712000
  );
  const F = normalizeDegrees(
    93.272095 -
      0.0036539 * T * T +
      483202.0175233 * T -
      (T * T * T) / 3526000 +
      (T * T * T * T) / 863310000
  );
  return { Lp, D, M, Mp, F };
}

/** Geocentric apparent tropical ecliptic longitude of the Moon, degrees. */
export function moonTropicalLongitude(T: number): number {
  const { Lp, D, M, Mp, F } = moonMeanArguments(T);

  let deltaL = 0;
  for (const term of LONGITUDE_TERMS) {
    const arg = degreesToRadians(
      term.d * D + term.m * M + term.mp * Mp + term.f * F
    );
    deltaL += term.coeff * Math.sin(arg);
  }

  return normalizeDegrees(Lp + deltaL);
}

/**
 * Mean ascending lunar node (Rahu) tropical longitude, degrees.
 * Ketu is always exactly 180° opposite.
 */
export function meanLunarNodeLongitude(T: number): number {
  const omega =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return normalizeDegrees(omega);
}
