import type { PlanetName } from "@gemstones-ai/shared";

export type FriendshipStatus = "friend" | "neutral" | "enemy";

/**
 * Naisargika Maitri — natural planetary friendship, as given in
 * classical Parashari texts (Brihat Parashara Hora Shastra). This
 * table only covers the 7 classical grahas; Rahu/Ketu are shadow
 * points with no canonical entry here (see RAHU_KETU_CAUTIONS below
 * for how their gemstone conflicts are handled instead — deliberately
 * kept to only the near-universally-cited caution, rather than
 * inventing a fuller friendship table for them that different schools
 * would actually disagree on).
 */
function pairKey(a: PlanetName, b: PlanetName): string {
  return [a, b].sort().join("-");
}

/**
 * Naisargika Maitri — natural planetary friendship, as given in
 * classical Parashari texts (Brihat Parashara Hora Shastra). This
 * table only covers the 7 classical grahas; Rahu/Ketu are shadow
 * points with no canonical entry here (see RAHU_KETU_SIMULTANEOUS_CAUTION
 * below for how their gemstone conflicts are handled instead — deliberately
 * kept to only the near-universally-cited caution, rather than
 * inventing a fuller friendship table for them that different schools
 * would actually disagree on).
 *
 * Listed as [planetA, planetB, status] tuples and built into the
 * lookup map via pairKey() itself, rather than hand-typed string
 * keys — that guarantees the map's keys always match what a lookup
 * will actually query for, regardless of which order each pair is
 * written in below.
 */
const NAISARGIKA_MAITRI_PAIRS: [PlanetName, PlanetName, FriendshipStatus][] = [
  ["Sun", "Moon", "friend"], ["Sun", "Mars", "friend"], ["Sun", "Jupiter", "friend"],
  ["Sun", "Mercury", "neutral"],
  ["Sun", "Venus", "enemy"], ["Sun", "Saturn", "enemy"],

  ["Moon", "Mercury", "friend"],
  ["Moon", "Mars", "neutral"], ["Moon", "Jupiter", "neutral"], ["Moon", "Venus", "neutral"], ["Moon", "Saturn", "neutral"],

  ["Mars", "Jupiter", "friend"],
  ["Mars", "Venus", "neutral"], ["Mars", "Saturn", "neutral"],
  ["Mars", "Mercury", "enemy"],

  ["Mercury", "Venus", "friend"],
  ["Mercury", "Jupiter", "neutral"], ["Mercury", "Saturn", "neutral"],

  ["Jupiter", "Saturn", "neutral"],
  ["Jupiter", "Venus", "enemy"],

  ["Venus", "Saturn", "friend"],
];

const NAISARGIKA_MAITRI: Record<string, FriendshipStatus> = Object.fromEntries(
  NAISARGIKA_MAITRI_PAIRS.map(([a, b, status]) => [pairKey(a, b), status])
);

const CLASSICAL_SEVEN: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

/** Looks up natural friendship between two of the 7 classical grahas.
 *  Returns null for any pair involving Rahu/Ketu (not covered by this
 *  table) or a planet paired with itself. */
export function naturalFriendship(a: PlanetName, b: PlanetName): FriendshipStatus | null {
  if (a === b) return null;
  if (!CLASSICAL_SEVEN.includes(a) || !CLASSICAL_SEVEN.includes(b)) return null;
  const key = pairKey(a, b);
  if (NAISARGIKA_MAITRI[key]) return NAISARGIKA_MAITRI[key];
  // Table only lists non-reciprocal or asymmetric entries explicitly
  // listed above; symmetric Sun-Mercury type entries are included.
  // Any pair not found and not self is not directly listed in the
  // classical table (rare edge case) — treat as neutral rather than
  // guessing.
  return "neutral";
}

/**
 * The one Rahu/Ketu combination cited near-universally across Vedic
 * gemstone literature as a caution: the nodes sit on the same axis
 * (always exactly 180° apart), so their gemstones (Hessonite and
 * Cat's Eye) are commonly advised against wearing simultaneously.
 * Anything beyond this single, widely-agreed caution is left for
 * expert-curated Rule-Graph data in a later phase rather than invented
 * here.
 */
export const RAHU_KETU_SIMULTANEOUS_CAUTION = {
  planets: ["Rahu", "Ketu"] as [PlanetName, PlanetName],
  reason:
    "Rahu and Ketu sit on the same axis, always exactly opposite each other — Hessonite and Cat's Eye are commonly cautioned against being worn together.",
};
