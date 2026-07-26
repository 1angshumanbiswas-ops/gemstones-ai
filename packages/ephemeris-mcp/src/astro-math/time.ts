/**
 * Julian Day and Julian-century helpers. All astronomical formulas in
 * this package are expressed relative to J2000.0 (JD 2451545.0), the
 * standard modern epoch.
 */

/** Converts a UTC Date to a Julian Day number (fractional). */
export function toJulianDay(utcDate: Date): number {
  let Y = utcDate.getUTCFullYear();
  let M = utcDate.getUTCMonth() + 1;
  const dayFraction =
    utcDate.getUTCDate() +
    (utcDate.getUTCHours() +
      utcDate.getUTCMinutes() / 60 +
      utcDate.getUTCSeconds() / 3600) /
      24;

  if (M <= 2) {
    Y -= 1;
    M += 12;
  }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    dayFraction +
    B -
    1524.5
  );
}

/** Julian centuries elapsed since J2000.0 (2000-01-01 12:00 TT, approximated
 *  here with UT — adequate at the sub-arcsecond irrelevance level for
 *  Phase 1's sign/nakshatra-resolution use case). */
export function julianCenturiesSinceJ2000(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

export function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function radiansToDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Normalizes an angle in degrees to the [0, 360) range. */
export function normalizeDegrees(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}
