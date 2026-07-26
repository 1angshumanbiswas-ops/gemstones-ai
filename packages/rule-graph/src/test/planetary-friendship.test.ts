import { test } from "node:test";
import assert from "node:assert/strict";
import { naturalFriendship } from "../planetary-friendship.js";

test("naturalFriendship is symmetric regardless of argument order", () => {
  assert.equal(naturalFriendship("Sun", "Saturn"), "enemy");
  assert.equal(naturalFriendship("Saturn", "Sun"), "enemy");

  assert.equal(naturalFriendship("Sun", "Moon"), "friend");
  assert.equal(naturalFriendship("Moon", "Sun"), "friend");

  assert.equal(naturalFriendship("Mercury", "Venus"), "friend");
  assert.equal(naturalFriendship("Venus", "Mercury"), "friend");
});

test("naturalFriendship returns correct status for every listed classical pair", () => {
  assert.equal(naturalFriendship("Sun", "Venus"), "enemy");
  assert.equal(naturalFriendship("Sun", "Mercury"), "neutral");
  assert.equal(naturalFriendship("Mars", "Mercury"), "enemy");
  assert.equal(naturalFriendship("Mars", "Jupiter"), "friend");
  assert.equal(naturalFriendship("Jupiter", "Venus"), "enemy");
  assert.equal(naturalFriendship("Venus", "Saturn"), "friend");
});

test("naturalFriendship returns null for Rahu/Ketu (not covered by the classical table)", () => {
  assert.equal(naturalFriendship("Rahu", "Sun"), null);
  assert.equal(naturalFriendship("Ketu", "Moon"), null);
});

test("naturalFriendship returns null for a planet paired with itself", () => {
  assert.equal(naturalFriendship("Mars", "Mars"), null);
});
