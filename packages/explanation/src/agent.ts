import Anthropic from "@anthropic-ai/sdk";
import type { ExplanationContext, ExplanationResult, SituationConcern } from "@gemstones-ai/shared";
import { getRemedyProfile, scanForBannedClaims } from "@gemstones-ai/gemology";
import { buildSystemPrompt, buildUserContext } from "./prompt.js";

const DEFAULT_MODEL = "claude-sonnet-5";

export interface ExplanationAgentDeps {
  anthropicApiKey: string;
  model?: string;
}

interface RawLLMOutput {
  sections: { concern: SituationConcern; text: string }[];
}

export function parseLLMJson(raw: string): RawLLMOutput {
  // Claude may occasionally wrap JSON in a code fence despite
  // instructions not to — strip that defensively before parsing.
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.sections)) {
    throw new Error("Explanation Agent output did not match the expected {sections: [...]} shape.");
  }
  return parsed as RawLLMOutput;
}

/**
 * Runs every section's text through the banned-phrase filter. Any
 * match is redacted (not silently dropped, not silently passed) and
 * recorded in flaggedAndRedacted so it's visible that something had
 * to be caught — this should be empty in normal operation; if it
 * isn't, that's a signal the system prompt needs strengthening, not
 * something to ignore.
 */
export function applyConsumerProtection(sections: { concern: SituationConcern; text: string }[]): {
  sections: { concern: SituationConcern; text: string }[];
  flaggedAndRedacted: string[];
} {
  const flaggedAndRedacted: string[] = [];
  const cleaned = sections.map((s) => {
    const matches = scanForBannedClaims(s.text);
    if (matches.length === 0) return s;

    let text = s.text;
    for (const m of matches) {
      flaggedAndRedacted.push(`[${s.concern}] "${m.matchedText}" (${m.reason})`);
      text = text.replace(m.matchedText, "[redacted — see disclaimer]");
    }
    return { ...s, text };
  });
  return { sections: cleaned, flaggedAndRedacted };
}

export async function generateExplanation(
  context: ExplanationContext,
  deps: ExplanationAgentDeps,
  requestId: string
): Promise<ExplanationResult> {
  const client = new Anthropic({ apiKey: deps.anthropicApiKey });

  const response = await client.messages.create({
    model: deps.model ?? DEFAULT_MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserContext(context) }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Explanation Agent received no text content from Claude.");
  }

  const raw = parseLLMJson(textBlock.text);
  const { sections, flaggedAndRedacted } = applyConsumerProtection(raw.sections);

  const remedies = context.enrichedCandidates.map((ec) => ({
    forGemstone: ec.traditional.gemstone,
    remedy: getRemedyProfile(ec.traditional.forPlanet),
  }));

  return {
    requestId,
    sections,
    remedies,
    flaggedAndRedacted,
    disclaimer:
      "This explanation is generated from deterministic chart data and traditional rule-graph output — " +
      "it explains what was already computed, it does not compute or invent astrological facts. Traditional " +
      "evidence only; not medical, legal, or financial advice; no outcome is guaranteed. High-impact gemstones " +
      "and any remedy still require qualified human review before anyone acts on them.",
  };
}
