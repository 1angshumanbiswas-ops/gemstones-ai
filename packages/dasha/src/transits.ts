import type { SadeSatiStatus, TransitSnapshot } from "@gemstones-ai/shared";

/**
 * Sade Sati is active when transiting Saturn occupies the 12th, 1st
 * (natal), or 2nd sign counting from the natal Moon's sign. This
 * implementation determines phase at *sign* resolution from the
 * current transit snapshot.
 *
 * KNOWN LIMITATION (Phase 1): exact phase start/end dates require
 * iteratively solving for when transiting Saturn's longitude crosses
 * a sign boundary (a root-finding search over the Ephemeris MCP's
 * planetGeocentricLongitude, not a closed-form calculation) — that
 * belongs in Phase 2's transit-search capability. Phase 1 reports
 * which phase is active today, without precise boundary dates.
 */
export function computeSadeSati(
  natalMoonSignIndex: number,
  transitingSaturnSignIndex: number
): SadeSatiStatus {
  const twelfthFromMoon = ((natalMoonSignIndex - 1 - 1 + 12) % 12) + 1;
  const secondFromMoon = ((natalMoonSignIndex - 1 + 1) % 12) + 1;

  if (transitingSaturnSignIndex === twelfthFromMoon) {
    return { isActive: true, phase: 1 };
  }
  if (transitingSaturnSignIndex === natalMoonSignIndex) {
    return { isActive: true, phase: 2 };
  }
  if (transitingSaturnSignIndex === secondFromMoon) {
    return { isActive: true, phase: 3 };
  }
  return { isActive: false, phase: null };
}

export function buildTransitSnapshot(params: {
  referenceDate: string;
  natalMoonSignIndex: number;
  saturnSignIndex: number;
  jupiterSignIndex: number;
  rahuSignIndex: number;
  ketuSignIndex: number;
}): TransitSnapshot {
  return {
    referenceDate: params.referenceDate,
    saturnSignIndex: params.saturnSignIndex,
    jupiterSignIndex: params.jupiterSignIndex,
    rahuSignIndex: params.rahuSignIndex,
    ketuSignIndex: params.ketuSignIndex,
    sadeSati: computeSadeSati(params.natalMoonSignIndex, params.saturnSignIndex),
  };
}
