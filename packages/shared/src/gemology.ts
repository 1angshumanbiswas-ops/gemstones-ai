import type { GemstoneCandidate, GemstoneName } from "./gemstone-rules.js";

/**
 * Physical/gemological facts about one gemstone species — Mohs
 * hardness, common treatments, durability, and care. This is settled
 * mineralogical fact (sourced in spirit from GIA's public Gem
 * Encyclopedia content), not a matter of astrological tradition, so
 * it is treated as static reference data rather than an expert-review
 * placeholder. Evidence level for anything built from this data is
 * "gemological" — a different, separate evidence layer from the
 * "traditional" astrological evidence in Phase 2's GemstoneCandidate.
 * The two must never be presented as validating each other.
 */
export interface GemologyProfile {
  gemstone: GemstoneName;
  mineralSpecies: string;
  mohsHardness: string; // range, e.g. "9" or "7.5-8"
  /** Treatments commonly applied to commercial-grade stones of this
   *  type — this is a disclosure obligation (FTC Jewelry Guides /
   *  CIBJO Blue Books style), not a claim about any specific stone. */
  commonTreatments: string[];
  durabilityNote: string;
  careInstructions: string;
  /** Broad tier only — never a specific price, which would misrepresent
   *  fabricated numbers as market fact. Used for the Consumer Protection
   *  Agent's budget-realism advisory, not as a quote. */
  typicalBudgetTier: "modest" | "moderate" | "high" | "very high";
}

export type CertificateVerificationStatus = "not_verified_by_this_app" | "format_invalid";

/**
 * Per the architecture's explicit MVP guidance: this app does not
 * scrape or independently verify certificates. It validates the
 * report-number format loosely and builds a deep link to the issuing
 * lab's own public report-check page for the person to confirm
 * themselves. Never claim programmatic verification that didn't happen.
 */
export interface CertificateCheckResult {
  laboratory: string;
  reportNumber: string;
  status: CertificateVerificationStatus;
  /** Present only when status is "not_verified_by_this_app" and a
   *  known lab's public check page could be linked to. */
  reportCheckUrl?: string;
  guidance: string;
}

export type BudgetRiskLevel = "none" | "advisory" | "high_risk";

export interface BudgetAdvisory {
  gemstone: GemstoneName;
  riskLevel: BudgetRiskLevel;
  message: string;
}

/**
 * Pairs a Phase 2 traditional candidate with its Phase 3 gemological
 * profile as two SEPARATE fields — deliberately not a single merged
 * object with blended fields. This is the app's core evidence-
 * separation principle made structural: `traditional` and `gemology`
 * are independently sourced and must be rendered as visually distinct
 * sections (see frontend), never combined into one narrative that
 * implies gemological facts support the astrological claim or vice
 * versa.
 */
export interface EnrichedGemstoneCandidate {
  traditional: GemstoneCandidate;
  gemology: GemologyProfile;
  budgetAdvisory?: BudgetAdvisory;
}
