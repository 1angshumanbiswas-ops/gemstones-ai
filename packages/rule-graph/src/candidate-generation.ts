import type {
  DashaPeriod,
  GemstoneCandidate,
  PlanetName,
  PlanetaryFunctionalNature,
} from "@gemstones-ai/shared";
import { PLANET_GEMSTONE } from "@gemstones-ai/shared";

/** The three gemstones the architecture explicitly names as requiring
 *  mandatory human expert review regardless of how they were
 *  shortlisted (Section 6/12: "Neelam, Gomed, Cat's Eye, etc."). */
const HIGH_IMPACT_PLANETS: PlanetName[] = ["Saturn", "Rahu", "Ketu"];

function riskFor(planet: PlanetName): "expert_review_required" | "moderate" {
  return HIGH_IMPACT_PLANETS.includes(planet) ? "expert_review_required" : "moderate";
}

/**
 * Rule 1 — Ascendant-lord strengthening. Near-universal across
 * Parashari schools: wearing the lagna lord's gemstone to strengthen
 * the native's foundational house is one of the least disputed
 * traditional recommendations there is.
 */
export function ascendantLordCandidate(
  functionalNatures: PlanetaryFunctionalNature[]
): GemstoneCandidate | null {
  const lagnaLord = functionalNatures.find((f) => f.rulesHouses.includes(1));
  if (!lagnaLord) return null; // e.g. Rahu/Ketu never reach here, they rule no house

  return {
    gemstone: PLANET_GEMSTONE[lagnaLord.planet],
    forPlanet: lagnaLord.planet,
    ruleId: "ascendant-lord-strengthening",
    ruleDescription: `${lagnaLord.planet} is the ascendant (lagna) lord — strengthening it is one of the most widely-agreed traditional gemstone principles.`,
    evidenceLevel: "traditional",
    riskClassification: riskFor(lagnaLord.planet),
  };
}

/**
 * Rule 2 — current dasha lord, if functionally benefic. Also
 * near-universal: amplifying a currently-running functional benefic's
 * period is a standard traditional rationale distinct from rule 1.
 */
export function currentDashaBeneficCandidate(
  currentPeriod: DashaPeriod[],
  functionalNatures: PlanetaryFunctionalNature[]
): GemstoneCandidate[] {
  const candidates: GemstoneCandidate[] = [];
  for (const period of currentPeriod) {
    const nature = functionalNatures.find((f) => f.planet === period.lord);
    if (!nature || nature.disposition !== "benefic") continue;
    candidates.push({
      gemstone: PLANET_GEMSTONE[period.lord],
      forPlanet: period.lord,
      ruleId: `current-${period.level}-benefic`,
      ruleDescription: `${period.lord} is both a functional benefic for this ascendant and the running ${period.level} lord — a standard rationale for amplifying its currently-active period.`,
      evidenceLevel: "traditional",
      riskClassification: riskFor(period.lord),
    });
  }
  return candidates;
}

/** Runs every candidate-generation rule and de-duplicates by gemstone
 *  (a planet can surface via both rules; keep the first, most specific,
 *  entry rather than double-listing the same stone). */
export function generateCandidates(
  functionalNatures: PlanetaryFunctionalNature[],
  currentPeriod: DashaPeriod[]
): GemstoneCandidate[] {
  const raw = [
    ...(ascendantLordCandidate(functionalNatures) ? [ascendantLordCandidate(functionalNatures)!] : []),
    ...currentDashaBeneficCandidate(currentPeriod, functionalNatures),
  ];

  const seen = new Set<string>();
  const deduped: GemstoneCandidate[] = [];
  for (const c of raw) {
    if (seen.has(c.gemstone)) continue;
    seen.add(c.gemstone);
    deduped.push(c);
  }
  return deduped;
}
