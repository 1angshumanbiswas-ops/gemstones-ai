/**
 * Lahiri (Chitrapaksha) ayanamsa — the offset subtracted from tropical
 * longitude to get sidereal longitude, which is what Vedic chart
 * calculation and the Rule-Graph MCP (Phase 2) expect throughout.
 *
 * KNOWN LIMITATION (Phase 1): this is a linear precession approximation
 * (~arcsecond-level drift over decades), not the official Indian
 * Astronomical Ephemeris polynomial or Swiss Ephemeris's own Lahiri
 * implementation. It is accurate enough that sign boundaries are only
 * at risk for births within roughly a day of a sign-change transit —
 * those cases should already be flagged as low `birthDataConfidence`
 * and routed toward human review. Before production use, replace this
 * with `swe_get_ayanamsa()` from Swiss Ephemeris.
 */
export function lahiriAyanamsaDegrees(julianCenturiesFromJ2000: number): number {
  const REFERENCE_AYANAMSA_AT_J2000 = 23.85667; // degrees
  const PRECESSION_DEG_PER_CENTURY = 1.396042;
  return (
    REFERENCE_AYANAMSA_AT_J2000 +
    PRECESSION_DEG_PER_CENTURY * julianCenturiesFromJ2000
  );
}
