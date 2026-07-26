import type {
  ConflictFlag,
  GemstoneCandidate,
  GemstoneName,
  GemstoneShortlistResult,
  PlanetName,
  PlanetaryFunctionalNature,
} from "@gemstones-ai/shared";
import { PLANET_GEMSTONE } from "@gemstones-ai/shared";
import { naturalFriendship, RAHU_KETU_SIMULTANEOUS_CAUTION } from "./planetary-friendship.js";

const HIGH_IMPACT_PLANETS: PlanetName[] = ["Saturn", "Rahu", "Ketu"];

function findNature(
  planet: PlanetName,
  natures: PlanetaryFunctionalNature[]
): PlanetaryFunctionalNature | undefined {
  return natures.find((n) => n.planet === planet);
}

/**
 * Runs every conflict check against a candidate list and returns the
 * flags plus the filtered "surviving" set (candidates with no
 * "excluded" flag against them — "caution" flags remain visible but
 * don't remove the candidate, since the point of a caution is to
 * surface it for the human reviewer, not silently drop it).
 */
export function checkConflicts(
  candidates: GemstoneCandidate[],
  functionalNatures: PlanetaryFunctionalNature[],
  existingGemstones: GemstoneName[] = []
): GemstoneShortlistResult {
  const conflicts: ConflictFlag[] = [];

  // 1. Functional-malefic exclusion: a candidate whose planet is a
  //    functional malefic for this ascendant is excluded outright —
  //    the near-universal rule that you don't strengthen a malefic.
  for (const c of candidates) {
    const nature = findNature(c.forPlanet, functionalNatures);
    if (nature?.disposition === "malefic") {
      conflicts.push({
        candidateGemstone: c.gemstone,
        severity: "excluded",
        reason: `${c.forPlanet} is a functional malefic for this ascendant (${nature.reasoning}) — its gemstone is excluded rather than recommended.`,
      });
    } else if (nature?.disposition === "neutral") {
      conflicts.push({
        candidateGemstone: c.gemstone,
        severity: "caution",
        reason: `${c.forPlanet} is functionally neutral for this ascendant (${nature.reasoning}) — proceed with caution rather than treating this as a clear-cut benefic recommendation.`,
      });
    }
  }

  // 2. Natural enmity between any two surviving candidates.
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      const friendship = naturalFriendship(a.forPlanet, b.forPlanet);
      if (friendship === "enemy") {
        conflicts.push({
          candidateGemstone: a.gemstone,
          conflictingWith: b.gemstone,
          severity: "caution",
          reason: `${a.forPlanet} and ${b.forPlanet} are classical natural enemies — wearing ${a.gemstone} and ${b.gemstone} together is commonly cautioned against.`,
        });
      }
    }
  }

  // 3. Rahu/Ketu simultaneous caution.
  const hasRahuCandidate = candidates.some((c) => c.forPlanet === "Rahu");
  const hasKetuCandidate = candidates.some((c) => c.forPlanet === "Ketu");
  if (hasRahuCandidate && hasKetuCandidate) {
    conflicts.push({
      candidateGemstone: "Hessonite (Gomed)",
      conflictingWith: "Cat's Eye (Lehsunia)",
      severity: "caution",
      reason: RAHU_KETU_SIMULTANEOUS_CAUTION.reason,
    });
  }

  // 4. Conflicts with gemstones the user already wears.
  for (const existing of existingGemstones) {
    const existingPlanet = (Object.entries(PLANET_GEMSTONE) as [PlanetName, GemstoneName][])
      .find(([, gem]) => gem === existing)?.[0];
    if (!existingPlanet) continue;

    for (const c of candidates) {
      const friendship = naturalFriendship(existingPlanet, c.forPlanet);
      if (friendship === "enemy") {
        conflicts.push({
          candidateGemstone: c.gemstone,
          conflictingWith: existing,
          severity: "caution",
          reason: `You already wear ${existing} (${existingPlanet}), which is a classical natural enemy of ${c.forPlanet} — combining it with ${c.gemstone} is commonly cautioned against.`,
        });
      }
    }
  }

  // 5. Mandatory human-review notice for high-impact stones — not a
  //    filtering conflict, but surfaced the same way so it's visible
  //    in one place; these candidates are NOT excluded by this alone.
  for (const c of candidates) {
    if (HIGH_IMPACT_PLANETS.includes(c.forPlanet)) {
      conflicts.push({
        candidateGemstone: c.gemstone,
        severity: "caution",
        reason: `${c.gemstone} is a high-impact stone (per architecture policy: Neelam/Gomed/Cat's Eye always require qualified human review before any recommendation is finalized).`,
      });
    }
  }

  const excludedGemstones = new Set(
    conflicts.filter((c) => c.severity === "excluded").map((c) => c.candidateGemstone)
  );
  const surviving = candidates.filter((c) => !excludedGemstones.has(c.gemstone));

  return { candidates, conflicts, surviving };
}
