import type {
  DivisionalChart,
  NatalChart,
  PlanetName,
  PlanetaryPosition,
} from "@gemstones-ai/shared";
import { toJulianDay, julianCenturiesSinceJ2000, normalizeDegrees } from "./astro-math/time.js";
import { lahiriAyanamsaDegrees } from "./astro-math/ayanamsa.js";
import { sunTropicalLongitude } from "./astro-math/sun.js";
import { moonTropicalLongitude, meanLunarNodeLongitude } from "./astro-math/moon.js";
import { CLASSICAL_PLANET_NAMES, planetGeocentricLongitude } from "./astro-math/planets.js";
import { ascendantTropicalLongitude, wholeSignHouses } from "./astro-math/houses.js";
import {
  nakshatraFromSiderealLongitude,
  signFromSiderealLongitude,
  navamsaSignIndex,
  dasamsaSignIndex,
} from "./astro-math/nakshatra-divisional.js";
import { isRetrograde, isCombust } from "./astro-math/motion-state.js";

export interface ChartRequest {
  /** UTC instant of birth — the caller (orchestrator) is responsible
   *  for converting local birth time + resolved IANA zone to UTC
   *  before calling this MCP server, per the Geo/Timezone MCP output. */
  utcDateTime: string; // ISO 8601
  latitude: number;
  longitude: number;
}

function buildPlanetPosition(
  name: PlanetName,
  tropicalLongitude: number,
  ayanamsa: number,
  retrograde: boolean,
  combust: boolean
): PlanetaryPosition {
  const siderealLongitude = normalizeDegrees(tropicalLongitude - ayanamsa);
  const { signIndex, degreesInSign } = signFromSiderealLongitude(siderealLongitude);
  const nakshatra = nakshatraFromSiderealLongitude(siderealLongitude);
  return {
    planet: name,
    siderealLongitude,
    signIndex,
    degreesInSign,
    isRetrograde: retrograde,
    isCombust: combust,
    nakshatra,
  };
}

export function buildNatalChart(req: ChartRequest): NatalChart {
  const utcDate = new Date(req.utcDateTime);
  const jd = toJulianDay(utcDate);
  const T = julianCenturiesSinceJ2000(jd);
  const ayanamsa = lahiriAyanamsaDegrees(T);

  const sunTropical = sunTropicalLongitude(T);
  const moonTropical = moonTropicalLongitude(T);
  const rahuTropical = meanLunarNodeLongitude(T);
  const ketuTropical = normalizeDegrees(rahuTropical + 180);

  const planets: PlanetaryPosition[] = [
    buildPlanetPosition("Sun", sunTropical, ayanamsa, false, false),
    buildPlanetPosition("Moon", moonTropical, ayanamsa, false, isCombust("Moon", moonTropical, sunTropical)),
  ];

  for (const name of CLASSICAL_PLANET_NAMES) {
    const tropical = planetGeocentricLongitude(name, T);
    const retro = isRetrograde(name, T);
    const combust = isCombust(name as PlanetName, tropical, sunTropical);
    planets.push(buildPlanetPosition(name as PlanetName, tropical, ayanamsa, retro, combust));
  }

  // Rahu/Ketu: mean lunar nodes, conventionally always treated as
  // retrograde in Vedic astrology; combustion rule does not apply.
  planets.push(buildPlanetPosition("Rahu", rahuTropical, ayanamsa, true, false));
  planets.push(buildPlanetPosition("Ketu", ketuTropical, ayanamsa, true, false));

  const ascTropical = ascendantTropicalLongitude(jd, T, req.latitude, req.longitude);
  const ascSidereal = normalizeDegrees(ascTropical - ayanamsa);
  const { signIndex: ascSignIndex } = signFromSiderealLongitude(ascSidereal);
  const houses = wholeSignHouses(ascSignIndex);

  const divisionalCharts: DivisionalChart[] = [
    buildDivisionalChart("D9", planets, navamsaSignIndex),
    buildDivisionalChart("D10", planets, dasamsaSignIndex),
  ];

  return {
    computedAt: new Date().toISOString(),
    ephemerisSource: "astronomia-vsop87",
    ayanamsa: "lahiri",
    planets,
    houses: {
      houseSignIndex: houses.houseSignIndex,
      ascendantSiderealLongitude: ascSidereal,
      ascendantSignIndex: ascSignIndex,
    },
    divisionalCharts,
    // Phase 1 uses a simplified two-body planetary model (see
    // astro-math/planets.ts) rather than a full numerical ephemeris,
    // so confidence is held below 1.0 even for a well-specified birth
    // time. This is surfaced to the user, never silently rounded up.
    calculationConfidence: 0.85,
  };
}

function buildDivisionalChart(
  name: "D9" | "D10",
  planets: PlanetaryPosition[],
  fn: (signIndex: number, degreesInSign: number) => number
): DivisionalChart {
  const planetSigns = {} as Record<PlanetName, number>;
  for (const p of planets) {
    planetSigns[p.planet] = fn(p.signIndex, p.degreesInSign);
  }
  return { name, planetSigns };
}
