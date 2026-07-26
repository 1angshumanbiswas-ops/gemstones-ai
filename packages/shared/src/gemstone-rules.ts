import type { PlanetName } from "./chart.js";

/**
 * The nine traditional Vedic gemstones and the single planet each is
 * classically associated with. This mapping itself (which stone
 * "belongs to" which planet) is essentially undisputed across
 * Parashari astrology schools — unlike, say, numerology compatibility
 * tables, this is core, universally-shared doctrine, so it's treated
 * as settled data rather than an expert-review placeholder.
 */
export type GemstoneName =
  | "Ruby" // Sun
  | "Pearl" // Moon
  | "Red Coral" // Mars
  | "Emerald" // Mercury
  | "Yellow Sapphire" // Jupiter
  | "Diamond" // Venus
  | "Blue Sapphire" // Saturn
  | "Hessonite (Gomed)" // Rahu
  | "Cat's Eye (Lehsunia)"; // Ketu

export const PLANET_GEMSTONE: Record<PlanetName, GemstoneName> = {
  Sun: "Ruby",
  Moon: "Pearl",
  Mars: "Red Coral",
  Mercury: "Emerald",
  Jupiter: "Yellow Sapphire",
  Venus: "Diamond",
  Saturn: "Blue Sapphire",
  Rahu: "Hessonite (Gomed)",
  Ketu: "Cat's Eye (Lehsunia)",
};

/** The three classical dispositions a planet's *nature* (not its
 *  current strength) can have with respect to a given ascendant. */
export type FunctionalDisposition = "benefic" | "malefic" | "neutral";

export interface PlanetaryFunctionalNature {
  planet: PlanetName;
  /** Houses this planet rules from the given ascendant (1-12, whole-sign) */
  rulesHouses: number[];
  /** Combines natural + functional (house-lordship) status per classical
   *  Parashari rules — see rule-graph package for the algorithm and its
   *  sourcing. */
  disposition: FunctionalDisposition;
  /** Short plain-language reason, e.g. "Rules the 5th and 10th
   *  (trikona + kendra) — a strong functional benefic for this ascendant." */
  reasoning: string;
}

export type EvidenceLevel = "traditional" | "gemological" | "laboratory_verified";
export type RiskClassification = "low" | "moderate" | "expert_review_required";

/**
 * One rule-graph-generated candidate, before the Gemstone Conflict
 * Agent has filtered it. This is Phase 2 output — no gemology,
 * certification, or consumer-protection data yet (Phases 3-4).
 */
export interface GemstoneCandidate {
  gemstone: GemstoneName;
  forPlanet: PlanetName;
  /** Which traditional rule generated this candidate — kept explicit
   *  so the audit trail can show exactly why a stone was shortlisted. */
  ruleId: string;
  ruleDescription: string;
  evidenceLevel: EvidenceLevel;
  riskClassification: RiskClassification;
}

export type ConflictSeverity = "excluded" | "caution";

export interface ConflictFlag {
  candidateGemstone: GemstoneName;
  severity: ConflictSeverity;
  reason: string;
  conflictingWith?: GemstoneName;
}

export interface GemstoneShortlistResult {
  candidates: GemstoneCandidate[];
  conflicts: ConflictFlag[];
  /** Candidates minus anything the conflict agent marked "excluded" —
   *  "caution" items remain, flagged, for the human reviewer to weigh. */
  surviving: GemstoneCandidate[];
}
