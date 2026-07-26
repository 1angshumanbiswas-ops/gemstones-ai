import type {
  FunctionalDisposition,
  PlanetName,
  PlanetaryFunctionalNature,
} from "@gemstones-ai/shared";
import { housesRuledBy } from "./house-lordship.js";

const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
const DUSTHANA = new Set([6, 8, 12]);

/**
 * Classifies a planet's FUNCTIONAL nature for a given ascendant — this
 * is the "which houses does it rule, and what does that make it"
 * calculation classical Parashari astrology uses to override a
 * planet's natural benefic/malefic status. This specific rule set
 * (kendra/trikona/dusthana, yogakaraka, ascendant-lord exception) is
 * textbook-standard across mainstream sources (e.g. Brihat Parashara
 * Hora Shastra-derived teaching) rather than one school's opinion —
 * unlike the numerology compatibility table in the numerology
 * package, this is treated as settled doctrine, not a
 * needs-expert-review placeholder.
 *
 * Rahu and Ketu rule no house in this system (see house-lordship.ts),
 * so they always come back "neutral" here — their gemstone
 * suitability is judged through affliction/placement/dasha relevance
 * in the Traditional Rule Agent instead, not house lordship.
 */
export function classifyFunctionalNature(
  planet: PlanetName,
  ascendantSignIndex: number
): PlanetaryFunctionalNature {
  const houses = housesRuledBy(planet, ascendantSignIndex);

  if (houses.length === 0) {
    return {
      planet,
      rulesHouses: [],
      disposition: "neutral",
      reasoning: `${planet} owns no house from this ascendant (shadow planet) — judged by placement and dasha relevance instead of lordship.`,
    };
  }

  const hasKendra = houses.some((h) => KENDRA.has(h));
  const hasTrikona = houses.some((h) => TRIKONA.has(h));
  const hasDusthana = houses.some((h) => DUSTHANA.has(h));
  const isPureLagnaLord = houses.length === 1 && houses[0] === 1;

  let disposition: FunctionalDisposition;
  let reasoning: string;

  if (isPureLagnaLord) {
    disposition = "benefic";
    reasoning = `${planet} rules only the 1st house (the ascendant itself) — the lagna lord is auspicious for the native regardless of natural nature.`;
  } else if (hasKendra && hasTrikona) {
    disposition = "benefic";
    reasoning = `${planet} rules both a kendra (${houses.filter((h) => KENDRA.has(h)).join(", ")}) and a trikona (${houses.filter((h) => TRIKONA.has(h)).join(", ")}) house — a yogakaraka, the strongest functional benefic for this ascendant.`;
  } else if (hasDusthana && hasTrikona) {
    disposition = "neutral";
    reasoning = `${planet} rules both a dusthana (${houses.filter((h) => DUSTHANA.has(h)).join(", ")}) and a trikona (${houses.filter((h) => TRIKONA.has(h)).join(", ")}) house — mixed signals; classical treatments differ, so this is held neutral rather than forced either way.`;
  } else if (hasTrikona) {
    disposition = "benefic";
    reasoning = `${planet} rules a trikona house (${houses.filter((h) => TRIKONA.has(h)).join(", ")}) — a functional benefic for this ascendant.`;
  } else if (hasDusthana) {
    disposition = "malefic";
    reasoning = `${planet} rules a dusthana house (${houses.filter((h) => DUSTHANA.has(h)).join(", ")}) — a functional malefic for this ascendant.`;
  } else if (hasKendra) {
    disposition = "neutral";
    reasoning = `${planet} rules only a kendra house (${houses.filter((h) => KENDRA.has(h)).join(", ")}) — kendra-only lordship is classically neutral rather than clearly benefic.`;
  } else {
    // Remaining case: 3rd and/or 11th house only (upachaya, non-kendra/trikona/dusthana).
    disposition = "malefic";
    reasoning = `${planet} rules only the 3rd/11th house(s) (${houses.join(", ")}) — commonly treated as a mild functional malefic in classical teaching.`;
  }

  return { planet, rulesHouses: houses, disposition, reasoning };
}

export function classifyAllPlanets(
  ascendantSignIndex: number,
  planets: PlanetName[]
): PlanetaryFunctionalNature[] {
  return planets.map((p) => classifyFunctionalNature(p, ascendantSignIndex));
}
