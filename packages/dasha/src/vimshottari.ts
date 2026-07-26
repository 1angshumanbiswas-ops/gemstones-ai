import type { DashaPeriod, DashaTimeline, PlanetName } from "@gemstones-ai/shared";

/** Cyclic Vimshottari order and each lord's fixed duration in years.
 *  Total = 120 years, the full Vimshottari cycle. */
export const VIMSHOTTARI_ORDER: PlanetName[] = [
  "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
];

export const VIMSHOTTARI_YEARS: Record<PlanetName, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};

const NAKSHATRA_SPAN = 360 / 27;
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * YEAR_MS);
}

/** Each of the 27 nakshatras is ruled by one of the 9 Vimshottari lords
 *  in the same cyclic order, repeating three times (27 = 9 x 3). */
export function nakshatraRuler(nakshatraIndex1To27: number): PlanetName {
  return VIMSHOTTARI_ORDER[(nakshatraIndex1To27 - 1) % 9];
}

/**
 * Computes the full sequence of Vimshottari Mahadashas covering one
 * complete 120-year cycle starting from birth. The first period is a
 * partial (balance) dasha — the fraction of its lord's full term
 * still "owed" based on how far the Moon had already progressed
 * through its birth nakshatra.
 */
export function computeMahadashas(
  moonSiderealLongitude: number,
  birthDate: Date
): DashaPeriod[] {
  const normalized = ((moonSiderealLongitude % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalized / NAKSHATRA_SPAN) + 1; // 1-27
  const degreesIntoNakshatra = normalized - (nakshatraIndex - 1) * NAKSHATRA_SPAN;
  const fractionElapsed = degreesIntoNakshatra / NAKSHATRA_SPAN;

  const startLord = nakshatraRuler(nakshatraIndex);
  const startIndex = VIMSHOTTARI_ORDER.indexOf(startLord);

  const periods: DashaPeriod[] = [];
  let cursor = birthDate;

  const firstLordFullYears = VIMSHOTTARI_YEARS[startLord];
  const firstLordBalanceYears = firstLordFullYears * (1 - fractionElapsed);
  const firstEnd = addYears(cursor, firstLordBalanceYears);
  periods.push({
    lord: startLord,
    startDate: cursor.toISOString().slice(0, 10),
    endDate: firstEnd.toISOString().slice(0, 10),
    level: "mahadasha",
  });
  cursor = firstEnd;

  // Remaining eight full-length mahadashas complete the 120-year cycle.
  for (let i = 1; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIndex + i) % 9];
    const years = VIMSHOTTARI_YEARS[lord];
    const end = addYears(cursor, years);
    periods.push({
      lord,
      startDate: cursor.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      level: "mahadasha",
    });
    cursor = end;
  }

  return periods;
}

/** Subdivides one mahadasha into its nine antardashas, each lasting
 *  (mahadasha lord's years x antardasha lord's years / 120), starting
 *  the sub-cycle from the mahadasha lord itself. */
export function computeAntardashas(mahadasha: DashaPeriod): DashaPeriod[] {
  const startIndex = VIMSHOTTARI_ORDER.indexOf(mahadasha.lord);
  const mahaYears = VIMSHOTTARI_YEARS[mahadasha.lord];
  let cursor = new Date(mahadasha.startDate);

  const periods: DashaPeriod[] = [];
  for (let i = 0; i < 9; i++) {
    const lord = VIMSHOTTARI_ORDER[(startIndex + i) % 9];
    const years = (mahaYears * VIMSHOTTARI_YEARS[lord]) / 120;
    const end = addYears(cursor, years);
    periods.push({
      lord,
      startDate: cursor.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      level: "antardasha",
      parentLords: [mahadasha.lord],
    });
    cursor = end;
  }
  return periods;
}

export function buildDashaTimeline(
  moonSiderealLongitude: number,
  birthDate: Date,
  referenceDate: Date = new Date()
): DashaTimeline {
  const mahadashas = computeMahadashas(moonSiderealLongitude, birthDate);

  const activeMahadasha = mahadashas.find(
    (p) => referenceDate >= new Date(p.startDate) && referenceDate < new Date(p.endDate)
  );

  const currentPeriod: DashaPeriod[] = [];
  if (activeMahadasha) {
    currentPeriod.push(activeMahadasha);
    const antardashas = computeAntardashas(activeMahadasha);
    const activeAntardasha = antardashas.find(
      (p) => referenceDate >= new Date(p.startDate) && referenceDate < new Date(p.endDate)
    );
    if (activeAntardasha) currentPeriod.push(activeAntardasha);
  }

  return {
    mahadashas,
    currentPeriod,
    referenceDate: referenceDate.toISOString().slice(0, 10),
  };
}
