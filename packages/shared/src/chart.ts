export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mars"
  | "Mercury"
  | "Jupiter"
  | "Venus"
  | "Saturn"
  | "Rahu"
  | "Ketu";

export interface PlanetaryPosition {
  planet: PlanetName;
  /** Sidereal (Lahiri ayanamsa) ecliptic longitude, degrees 0-360 */
  siderealLongitude: number;
  /** 1-12, which sign the planet occupies (1 = Aries) */
  signIndex: number;
  /** Degrees within the sign, 0-30 */
  degreesInSign: number;
  isRetrograde: boolean;
  /** True when within ~8-12 degrees of the Sun (varies by planet) —
   *  the Rule Agent needs this for combustion checks in Phase 2 */
  isCombust: boolean;
  nakshatra: {
    name: string;
    /** 1-27 */
    index: number;
    /** 1-4 */
    pada: number;
  };
}

export interface HouseCusps {
  /** House 1-12 -> sign index occupying that house cusp (whole-sign) */
  houseSignIndex: Record<number, number>;
  ascendantSiderealLongitude: number;
  ascendantSignIndex: number;
}

export interface DivisionalChart {
  /** e.g. "D9" (Navamsa), "D10" (Dasamsa) */
  name: string;
  /** planet -> sign index in this divisional chart */
  planetSigns: Record<PlanetName, number>;
}

/**
 * Full output of the Ephemeris MCP + Geolocation/Timezone MCP calls,
 * consumed by the Horoscope Calculation Agent. This object is the
 * deterministic ground truth — the AI explanation layer may describe
 * it but must never regenerate or alter any field in it.
 */
export interface NatalChart {
  computedAt: string; // ISO timestamp of when this calc ran
  ephemerisSource: "swiss-ephemeris" | "astronomia-vsop87";
  ayanamsa: "lahiri";
  planets: PlanetaryPosition[];
  houses: HouseCusps;
  divisionalCharts: DivisionalChart[];
  /** Astronomical calculation confidence, 0-1 — see Section 11.
   *  Near 1.0 for VSOP87/Swiss Ephemeris in the modern era; the
   *  Explanation Agent must surface this alongside the chart, never
   *  blend it into one "accuracy score". */
  calculationConfidence: number;
}
