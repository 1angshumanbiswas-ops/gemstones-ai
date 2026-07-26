import type { DashaPeriod, GemstoneName, GemstoneShortlistResult, PlanetName } from "@gemstones-ai/shared";
import { classifyAllPlanets } from "./functional-nature.js";
import { generateCandidates } from "./candidate-generation.js";
import { checkConflicts } from "./conflict.js";

const ALL_PLANETS: PlanetName[] = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
];

export interface RuleGraphRequest {
  ascendantSignIndex: number;
  currentDashaPeriod: DashaPeriod[];
  existingGemstones?: GemstoneName[];
}

export function buildGemstoneShortlist(req: RuleGraphRequest): GemstoneShortlistResult & {
  functionalNatures: ReturnType<typeof classifyAllPlanets>;
} {
  const functionalNatures = classifyAllPlanets(req.ascendantSignIndex, ALL_PLANETS);
  const candidates = generateCandidates(functionalNatures, req.currentDashaPeriod);
  const result = checkConflicts(candidates, functionalNatures, req.existingGemstones ?? []);
  return { ...result, functionalNatures };
}
