import Anthropic from "@anthropic-ai/sdk";
import type { ExplanationContext, ExplanationResult, SituationConcern } from "@gemstones-ai/shared";
import { getRemedyProfile, scanForBannedClaims } from "@gemstones-ai/gemology";
import { buildSystemPrompt, buildUserContext } from "./prompt.js";

const DEFAULT_MODEL = "claude-sonnet-5";
const TOOL_NAME = "submit_explanation";

export interface ExplanationAgentDeps {
  anthropicApiKey: string;
  model?: string;
}

interface RawLLMOutput {
  sections: { concern: SituationConcern; text: string }[];
}

/**
 * Forces Claude's response through a tool call with a fixed schema
 * rather than asking it to hand-write valid JSON in prose. This is
 * the fix for "Unterminated string in JSON" style failures — those
 * happened because a free-text JSON response can be truncated
 * mid-string if it runs long (e.g. several concern categories
 * selected at once); tool-use output is validated against the schema
 * by the API itself and doesn't depend on the model correctly
 * balancing its own quotes and braces under a token budget.
 */
const EXPLANATION_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Submit the plain-language explanation sections.",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            concern: {
              type: "string",
              enum: ["career", "finance", "health", "marriage", "litigation", "education"],
            },
            text: { type: "string" },
          },
          required: ["concern", "text"],
        },
      },
    },
    required: ["sections"],
  },
};

/** Validates the shape of the tool call's already-parsed input —
 *  the SDK guarantees valid JSON syntax via tool-use, but the shape
 *  is still worth checking rather than trusting blindly. */
export function validateLLMOutput(input: unknown): RawLLMOutput {
  if (
    !input ||
    typeof input !== "object" ||
    !Array.isArray((input as RawLLMOutput).sections)
  ) {
    throw new Error("Explanation Agent output did not match the expected {sections: [...]} shape.");
  }
  return input as RawLLMOutput;
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
    max_tokens: 4096,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: buildUserContext(context) }],
    tools: [EXPLANATION_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error(
      `Explanation Agent did not receive a tool call from Claude (stop_reason: ${response.stop_reason}).`
    );
  }

  const raw = validateLLMOutput(toolUseBlock.input);
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
