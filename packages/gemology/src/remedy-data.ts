import type { PlanetName, RemedyProfile } from "@gemstones-ai/shared";

/**
 * Standard Navagraha (nine-planet) remedy correspondences, as
 * commonly cited across mainstream Vedic astrology remedy literature.
 * Kept deliberately to the most widely-agreed core (deity, one
 * standard mantra, typical donation items, the conventional fasting
 * day) rather than elaborated ritual instructions, since procedural
 * detail varies more by regional tradition and is better left to a
 * qualified astrologer than encoded here as one-true-answer.
 */
const REMEDY_DATA: Record<PlanetName, RemedyProfile> = {
  Sun: {
    planet: "Sun", deity: "Surya",
    mantra: "Om Suryaya Namah",
    donationItems: ["Wheat", "Jaggery", "Copper", "Red cloth"],
    fastingDay: "Sunday",
  },
  Moon: {
    planet: "Moon", deity: "Chandra",
    mantra: "Om Chandraya Namah",
    donationItems: ["Rice", "Milk", "White cloth", "Silver"],
    fastingDay: "Monday",
  },
  Mars: {
    planet: "Mars", deity: "Mangal",
    mantra: "Om Angarakaya Namah",
    donationItems: ["Red lentils (masoor dal)", "Jaggery", "Red cloth"],
    fastingDay: "Tuesday",
  },
  Mercury: {
    planet: "Mercury", deity: "Budha",
    mantra: "Om Budhaya Namah",
    donationItems: ["Green moong dal", "Green cloth", "Bronze"],
    fastingDay: "Wednesday",
  },
  Jupiter: {
    planet: "Jupiter", deity: "Brihaspati",
    mantra: "Om Brihaspataye Namah",
    donationItems: ["Turmeric", "Yellow cloth", "Chana dal", "Gold (if affordable)"],
    fastingDay: "Thursday",
  },
  Venus: {
    planet: "Venus", deity: "Shukra",
    mantra: "Om Shukraya Namah",
    donationItems: ["White cloth", "Rice", "Sugar", "Curd"],
    fastingDay: "Friday",
  },
  Saturn: {
    planet: "Saturn", deity: "Shani",
    mantra: "Om Shanicharaya Namah",
    donationItems: ["Mustard oil", "Black sesame seeds", "Black cloth", "Iron"],
    fastingDay: "Saturday",
  },
  Rahu: {
    planet: "Rahu", deity: "Rahu (commonly propitiated alongside Durga in some traditions)",
    mantra: "Om Rahave Namah",
    donationItems: ["Blue or black cloth", "Mustard seeds", "Coconut"],
    fastingDay: "Saturday",
  },
  Ketu: {
    planet: "Ketu", deity: "Ketu (commonly propitiated alongside Ganesha in some traditions)",
    mantra: "Om Ketave Namah",
    donationItems: ["Multi-colored cloth", "Sesame seeds", "Blankets"],
    fastingDay: "Tuesday",
  },
};

export function getRemedyProfile(planet: PlanetName): RemedyProfile {
  return REMEDY_DATA[planet];
}
