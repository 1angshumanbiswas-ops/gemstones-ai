import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLLMOutput, applyConsumerProtection } from "../agent.js";

test("validateLLMOutput accepts a well-formed sections array", () => {
  const result = validateLLMOutput({ sections: [{ concern: "career", text: "hello" }] });
  assert.equal(result.sections.length, 1);
  assert.equal(result.sections[0].concern, "career");
});

test("validateLLMOutput throws a clear error when sections is missing or malformed, rather than silently returning garbage", () => {
  assert.throws(() => validateLLMOutput({ notSections: [] }));
  assert.throws(() => validateLLMOutput(null));
  assert.throws(() => validateLLMOutput("not an object"));
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
