import type { ExplanationContext, SituationConcern } from "@gemstones-ai/shared";
import { getRemedyProfile } from "@gemstones-ai/gemology";

const CONCERN_LABELS: Record<SituationConcern, string> = {
  career: "Career",
  finance: "Finance",
  health: "Health",
  marriage: "Marriage",
  litigation: "Litigation",
  education: "Education",
};

/**
 * The system prompt is the entire safety mechanism here — it's what
 * keeps the LLM to "explain this already-computed data" rather than
 * "generate astrological content." Every constraint below maps
 * directly to a Section 10/12 requirement from the architecture spec.
 */
export function buildSystemPrompt(): string {
  return `You are the Explanation Agent for Gemstones_AI, a Vedic astrology and gemology platform.

Your ONLY job is to explain, in plain language, the deterministic and rule-graph data provided to you below. You must follow these rules without exception:

1. NEVER invent, alter, or contradict any planetary position, house, dasha date, numerology value, gemstone candidate, or remedy fact given to you. Every astrological fact in your explanation must come directly from the data provided.
2. NEVER guarantee any outcome — no promised job, no promised financial recovery, no promised marriage, no promised legal victory, no promised health improvement. Use only conditional, traditional-context language ("traditionally associated with", "some practitioners suggest").
3. NEVER make medical claims or suggest any remedy replaces medical, legal, or financial professional advice.
4. NEVER claim a stone or remedy is guaranteed to work, is "supercharged," "energised," or requires no certification.
5. For each requested concern category, write 2-4 sentences connecting the relevant chart/dasha data to that life area, in a measured, traditional-astrology register — not a fortune-teller's certainty.
6. If remedy data is provided for a planet, you may mention its mantra, deity, donation items, or fasting day — but always frame these as traditional practices, never as guaranteed remedies.
7. Output ONLY valid JSON matching this exact shape, no other text:
{"sections": [{"concern": "career", "text": "..."}, ...]}`;
}

export function buildUserContext(context: ExplanationContext): string {
  const lines: string[] = [];
  lines.push(`Ascendant: ${context.ascendantSignName}`);
  lines.push(`Moon nakshatra: ${context.moonNakshatraName}`);
  lines.push("");
  lines.push("Planetary positions:");
  for (const p of context.planets) {
    const flags = [p.isRetrograde ? "retrograde" : "", p.isCombust ? "combust" : ""].filter(Boolean).join(", ");
    lines.push(`- ${p.planet}: sign index ${p.signIndex}, ${p.degreesInSign.toFixed(1)}°, nakshatra ${p.nakshatra.name}${flags ? ` (${flags})` : ""}`);
  }
  lines.push("");
  lines.push(`Current dasha period: ${context.currentDashaPeriod.map((d) => `${d.level}=${d.lord}`).join(", ")}`);
  lines.push("");
  lines.push(`Numerology: Mulank ${context.numerology.mulank}, Bhagyank ${context.numerology.bhagyank}, Personal Year ${context.numerology.personalYear}`);
  lines.push("");
  lines.push(`Current transits: Saturn in sign ${context.transitSnapshot.saturnSignIndex}, Jupiter in sign ${context.transitSnapshot.jupiterSignIndex}, Sade Sati ${context.transitSnapshot.sadeSati.isActive ? `active (phase ${context.transitSnapshot.sadeSati.phase})` : "not active"}`);
  lines.push("");
  lines.push("Traditional gemstone shortlist (with gemology and remedy data):");
  for (const ec of context.enrichedCandidates) {
    const remedy = getRemedyProfile(ec.traditional.forPlanet);
    lines.push(
      `- ${ec.traditional.gemstone} (for ${ec.traditional.forPlanet}): ${ec.traditional.ruleDescription} ` +
        `Gemology: ${ec.gemology.mineralSpecies}, Mohs ${ec.gemology.mohsHardness}. ` +
        `Remedy data for ${ec.traditional.forPlanet}: deity ${remedy.deity}, mantra "${remedy.mantra}", ` +
        `fasting day ${remedy.fastingDay}, donations: ${remedy.donationItems.join(", ")}.`
    );
  }
  lines.push("");
  lines.push(`Requested concern categories: ${context.concerns.map((c) => CONCERN_LABELS[c]).join(", ")}`);
  return lines.join("\n");
}
