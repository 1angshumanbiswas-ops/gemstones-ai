import { degreesToRadians, normalizeDegrees, radiansToDegrees } from "./time.js";

interface OrbitalElements {
  a0: number; // semi-major axis, AU
  aDot: number; // per Julian century
  e0: number; // eccentricity
  eDot: number;
  i0: number; // inclination, degrees
  iDot: number;
  L0: number; // mean longitude, degrees
  LDot: number;
  peri0: number; // longitude of perihelion (ϖ), degrees
  periDot: number;
  node0: number; // longitude of ascending node (Ω), degrees
  nodeDot: number;
}

/**
 * Standish (1992) J2000 mean orbital elements, valid over roughly
 * 1800-2050 to arcminute-level accuracy. This ignores planet-planet
 * perturbations, so it is a *simplified two-body approximation* —
 * adequate for sign-level (30°) and usually nakshatra-level (13.33°)
 * Vedic astrology placements, but NOT a substitute for a real
 * numerical ephemeris. Swap for Swiss Ephemeris before production use;
 * see README "Known limitations".
 */
const ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: {
    a0: 0.38709927, aDot: 0.00000037,
    e0: 0.20563593, eDot: 0.00001906,
    i0: 7.00497902, iDot: -0.00594749,
    L0: 252.2503235, LDot: 149472.67411175,
    peri0: 77.45779628, periDot: 0.16047689,
    node0: 48.33076593, nodeDot: -0.12534081,
  },
  Venus: {
    a0: 0.72333566, aDot: 0.0000039,
    e0: 0.00677672, eDot: -0.00004107,
    i0: 3.39467605, iDot: -0.0007889,
    L0: 181.9790995, LDot: 58517.81538729,
    peri0: 131.60246718, periDot: 0.00268329,
    node0: 76.67984255, nodeDot: -0.27769418,
  },
  Earth: {
    a0: 1.00000261, aDot: 0.00000562,
    e0: 0.01671123, eDot: -0.00004392,
    i0: -0.00001531, iDot: -0.01294668,
    L0: 100.46457166, LDot: 35999.37244981,
    peri0: 102.93768193, periDot: 0.32327364,
    node0: 0, nodeDot: 0,
  },
  Mars: {
    a0: 1.52371034, aDot: 0.00001847,
    e0: 0.0933941, eDot: 0.00007882,
    i0: 1.84969142, iDot: -0.00813131,
    L0: -4.55343205, LDot: 19140.30268499,
    peri0: -23.94362959, periDot: 0.44441088,
    node0: 49.55953891, nodeDot: -0.29257343,
  },
  Jupiter: {
    a0: 5.202887, aDot: -0.00011607,
    e0: 0.04838624, eDot: -0.00013253,
    i0: 1.30439695, iDot: -0.00183714,
    L0: 34.39644051, LDot: 3034.74612775,
    peri0: 14.72847983, periDot: 0.21252668,
    node0: 100.47390909, nodeDot: 0.20469106,
  },
  Saturn: {
    a0: 9.53667594, aDot: -0.0012506,
    e0: 0.05386179, eDot: -0.00050991,
    i0: 2.48599187, iDot: 0.00193609,
    L0: 49.95424423, LDot: 1222.49362201,
    peri0: 92.59887831, periDot: -0.41897216,
    node0: 113.66242448, nodeDot: -0.28867794,
  },
};

interface EclipticPosition {
  x: number;
  y: number;
  z: number;
}

/** Solves Kepler's equation E - e*sin(E) = M for eccentric anomaly E (radians). */
function solveKepler(meanAnomalyRad: number, e: number): number {
  let E = meanAnomalyRad;
  for (let iter = 0; iter < 8; iter++) {
    const dE =
      (E - e * Math.sin(E) - meanAnomalyRad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

function heliocentricPosition(name: string, T: number): EclipticPosition {
  const el = ELEMENTS[name];
  if (!el) throw new Error(`No orbital elements for ${name}`);

  const a = el.a0 + el.aDot * T;
  const e = el.e0 + el.eDot * T;
  const i = degreesToRadians(el.i0 + el.iDot * T);
  const L = el.L0 + el.LDot * T;
  const peri = el.peri0 + el.periDot * T;
  const node = el.node0 + el.nodeDot * T;

  const w = degreesToRadians(normalizeDegrees(peri - node)); // argument of perihelion
  const Omega = degreesToRadians(normalizeDegrees(node));

  let M = normalizeDegrees(L - peri);
  if (M > 180) M -= 360;
  const Mrad = degreesToRadians(M);

  const E = solveKepler(Mrad, e);

  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosO = Math.cos(Omega), sinO = Math.sin(Omega);
  const cosI = Math.cos(i), sinI = Math.sin(i);

  const x =
    (cosW * cosO - sinW * sinO * cosI) * xv +
    (-sinW * cosO - cosW * sinO * cosI) * yv;
  const y =
    (cosW * sinO + sinW * cosO * cosI) * xv +
    (-sinW * sinO + cosW * cosO * cosI) * yv;
  const z = sinW * sinI * xv + cosW * sinI * yv;

  return { x, y, z };
}

/**
 * Geocentric tropical ecliptic longitude of a planet, degrees, via
 * heliocentric vector subtraction (planet heliocentric position minus
 * Earth's heliocentric position).
 */
export function planetGeocentricLongitude(name: string, T: number): number {
  const planetPos = heliocentricPosition(name, T);
  const earthPos = heliocentricPosition("Earth", T);

  const dx = planetPos.x - earthPos.x;
  const dy = planetPos.y - earthPos.y;

  return normalizeDegrees(radiansToDegrees(Math.atan2(dy, dx)));
}

export const CLASSICAL_PLANET_NAMES = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
] as const;
