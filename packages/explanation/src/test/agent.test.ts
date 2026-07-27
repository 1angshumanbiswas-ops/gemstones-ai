import { test } from "node:test";
import assert from "node:assert/strict";
import { parseLLMJson, applyConsumerProtection } from "../agent.js";

test("parseLLMJson parses clean JSON output", () => {
  const result = parseLLMJson('{"sections": [{"concern": "career", "text": "hello"}]}');
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].concern, "career");
});

test("parseLLMJson strips a markdown code fence if Claude adds one despite instructions", () => {
  const result = parseLLMJson('```json\n{"sections": [{"concern": "career", "text": "hello"}]}\n```');
  assert.equal(result.sections.length, 1);
});

test("parseLLMJson throws a clear error on a malformed shape rather than silently returning garbage", () => {
  assert.throws(() => parseLLMJson('{"notSections": []}'));
});

test("applyConsumerProtection redacts a banned claim and records what was caught", () => {
  const { sections, flaggedAndRedacted } = applyConsumerProtection([
    { concern: "finance", text: "This gemstone will recover your ₹14 lakh for you." },
  ]);
  assert.doesNotMatch(sections[0].text, /recover your ₹14 lakh/);
  assert.equal(flaggedAndRedacted.length, 1);
  assert.match(flaggedAndRedacted[0], /financial recovery/);
});

test("applyConsumerProtection passes clean text through unchanged", () => {
  const { sections, flaggedAndRedacted } = applyConsumerProtection([
    { concern: "career", text: "Jupiter's placement is traditionally associated with growth in this area." },
  ]);
  assert.equal(sections[0].text, "Jupiter's placement is traditionally associated with growth in this area.");
  assert.equal(flaggedAndRedacted.length, 0);
});
