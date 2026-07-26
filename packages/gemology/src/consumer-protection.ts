import type { BudgetAdvisory, GemologyProfile, GemstoneName } from "@gemstones-ai/shared";

/**
 * Patterns this app must never let through in any user-facing text —
 * matches the exact examples Section 12 names. This has nothing to
 * filter yet (Phase 3 has no free-text LLM output), but it's real,
 * tested infrastructure ready for Phase 4's Explanation Agent, whose
 * output this MUST run through before ever reaching a user.
 */
const BANNED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /recover(s|ed)?\s+(your\s+)?[₹$][\d,]+/i, reason: "guaranteed financial recovery claim" },
  { pattern: /\b(job|employment)\s+within\s+\d+\s+(day|week|month)/i, reason: "guaranteed employment-outcome claim" },
  { pattern: /\b10x\s*(energis|energiz)/i, reason: "unverifiable \"energised power\" multiplier claim" },
  { pattern: /\bcures?\b.*\b(depression|diabetes|cancer|disease|illness)\b/i, reason: "medical cure claim" },
  { pattern: /no\s+certificate\s+(is\s+)?(necessary|needed|required)/i, reason: "discourages certification, contradicts consumer-protection policy" },
];

export interface BannedPhraseMatch {
  matchedText: string;
  reason: string;
}

/** Scans a block of user-facing text for the specific banned-claim
 *  patterns Section 12 names. Returns every match found — callers
 *  decide whether to block, redact, or flag for review. */
export function scanForBannedClaims(text: string): BannedPhraseMatch[] {
  const matches: BannedPhraseMatch[] = [];
  for (const { pattern, reason } of BANNED_PATTERNS) {
    const found = text.match(pattern);
    if (found) matches.push({ matchedText: found[0], reason });
  }
  return matches;
}

export function containsBannedClaims(text: string): boolean {
  return scanForBannedClaims(text).length > 0;
}

/**
 * Budget-realism advisory: purely informational, never blocking.
 * Flags when a stated budget sits well below what a genuine, untreated
 * stone of that tier typically costs — the classic setup for a
 * synthetic-sold-as-natural or "too good to be true" scam. No specific
 * numbers are asserted; only a qualitative tier comparison.
 */
const TIER_ADVISORY_THRESHOLD_INR: Record<GemologyProfile["typicalBudgetTier"], number> = {
  modest: 3000,
  moderate: 15000,
  high: 50000,
  "very high": 150000,
};

export function buildBudgetAdvisory(
  gemstone: GemstoneName,
  gemologyProfile: GemologyProfile,
  budgetINR: number | undefined
): BudgetAdvisory | undefined {
  if (budgetINR === undefined) return undefined;

  const threshold = TIER_ADVISORY_THRESHOLD_INR[gemologyProfile.typicalBudgetTier];

  if (budgetINR < threshold * 0.15) {
    return {
      gemstone,
      riskLevel: "high_risk",
      message: `Your stated budget is far below the typical range for a genuine, untreated ${gemstone.toLowerCase()}. At this price point, be especially cautious of synthetic or heavily treated stones sold as natural — always insist on a laboratory report.`,
    };
  }
  if (budgetINR < threshold * 0.5) {
    return {
      gemstone,
      riskLevel: "advisory",
      message: `Your stated budget is on the lower end for a genuine ${gemstone.toLowerCase()}. Expect either a smaller/lower-clarity stone or a treated one — ask the seller to disclose any treatments explicitly.`,
    };
  }
  return { gemstone, riskLevel: "none", message: "Stated budget is within a typical range for this gemstone tier." };
}
