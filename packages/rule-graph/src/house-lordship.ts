import type { PlanetName } from "@gemstones-ai/shared";

/** Classical sign rulerships (1=Aries...12=Pisces). Rahu/Ketu rule no
 *  sign in mainstream Parashari astrology — they're "chhaya grahas"
 *  (shadow points), not among the 7 classical grahas that own signs. */
export const SIGN_RULER: Record<number, PlanetName> = {
  1: "Mars", 2: "Venus", 3: "Mercury", 4: "Moon", 5: "Sun", 6: "Mercury",
  7: "Venus", 8: "Mars", 9: "Jupiter", 10: "Saturn", 11: "Saturn", 12: "Jupiter",
};

/** Which sign occupies a given whole-sign house, counting from the
 *  ascendant. House 1 = ascendant sign. */
export function houseSignIndex(ascendantSignIndex: number, house: number): number {
  return (((ascendantSignIndex - 1) + (house - 1)) % 12) + 1;
}

/** All houses (1-12) a planet rules from a given ascendant. Sun and
 *  Moon rule exactly one sign each, so exactly one house; every other
 *  classical graha rules two signs, so up to two houses. Rahu/Ketu
 *  always return an empty array (see SIGN_RULER note above). */
export function housesRuledBy(planet: PlanetName, ascendantSignIndex: number): number[] {
  const houses: number[] = [];
  for (let house = 1; house <= 12; house++) {
    const sign = houseSignIndex(ascendantSignIndex, house);
    if (SIGN_RULER[sign] === planet) houses.push(house);
  }
  return houses;
}
