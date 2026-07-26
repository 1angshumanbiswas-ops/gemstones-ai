const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
] as const;

const NAKSHATRA_SPAN = 360 / 27; // 13.3333...
const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3.3333...

export interface NakshatraResult {
  name: string;
  index: number; // 1-27
  pada: number; // 1-4
}

export function nakshatraFromSiderealLongitude(siderealLongitude: number): NakshatraResult {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  const index = Math.floor(normalized / NAKSHATRA_SPAN); // 0-26
  const withinNakshatra = normalized - index * NAKSHATRA_SPAN;
  const pada = Math.floor(withinNakshatra / PADA_SPAN) + 1; // 1-4
  return { name: NAKSHATRA_NAMES[index], index: index + 1, pada };
}

export function signFromSiderealLongitude(siderealLongitude: number): {
  signIndex: number;
  degreesInSign: number;
} {
  const normalized = ((siderealLongitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30) + 1; // 1-12
  const degreesInSign = normalized - (signIndex - 1) * 30;
  return { signIndex, degreesInSign };
}

/**
 * D9 Navamsa sign index (1-12). Each sign's 30° splits into nine 3°20'
 * parts; movable/fixed/dual signs start their count from different
 * offsets. This closed-form works uniformly for all three sign types
 * (verified against the classical starting-point rule for each type).
 */
export function navamsaSignIndex(signIndex: number, degreesInSign: number): number {
  const part = Math.min(8, Math.floor(degreesInSign / (30 / 9))); // 0-8
  return (((signIndex - 1) * 9 + part) % 12) + 1;
}

/**
 * D10 Dasamsa sign index (1-12). Each sign's 30° splits into ten 3°
 * parts. Odd signs count from themselves; even signs count from the
 * 9th sign from themselves (classical rule, kept as explicit branches
 * rather than a unified formula for clarity/auditability).
 */
export function dasamsaSignIndex(signIndex: number, degreesInSign: number): number {
  const part = Math.min(9, Math.floor(degreesInSign / 3)); // 0-9
  const isOdd = signIndex % 2 === 1;
  const startOffset = isOdd ? 0 : 8;
  return (((signIndex - 1) + startOffset + part) % 12) + 1;
}
