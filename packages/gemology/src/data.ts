import type { GemologyProfile, GemstoneName } from "@gemstones-ai/shared";

/**
 * Static gemological reference data. This is settled mineralogical
 * fact — hardness values and common-treatment practices are widely
 * documented (e.g. in GIA's public Gem Encyclopedia, the exact kind
 * of source the architecture calls for) — not a matter of opinion the
 * way traditional-rule content can be. Treatment lists describe
 * INDUSTRY-COMMON practice for the gem type, not a claim about any
 * specific stone a person might buy — that distinction must stay
 * explicit wherever this data is surfaced (see the disclosure
 * language built around it).
 */
const GEMOLOGY_DATA: Record<GemstoneName, GemologyProfile> = {
  Ruby: {
    gemstone: "Ruby",
    mineralSpecies: "Corundum (aluminum oxide)",
    mohsHardness: "9",
    commonTreatments: ["Heat treatment (industry standard)", "Lead-glass filling (lower grades)", "Diffusion treatment"],
    durabilityNote: "Excellent hardness and toughness; among the most durable colored gemstones for everyday wear.",
    careInstructions: "Warm soapy water is safe for most stones. Avoid ultrasonic/steam cleaning if the stone is glass-filled or heavily fracture-filled.",
    typicalBudgetTier: "high",
  },
  Pearl: {
    gemstone: "Pearl",
    mineralSpecies: "Nacre (calcium carbonate, organic)",
    mohsHardness: "2.5-4.5",
    commonTreatments: ["Bleaching", "Dyeing", "Coating"],
    durabilityNote: "Soft and organic — scratches easily and is sensitive to acids, perfume, and cosmetics.",
    careInstructions: "Wipe with a soft cloth after wearing. Apply perfume/cosmetics before putting pearls on, not after. Never use ultrasonic cleaning. Store separately, away from harder gems.",
    typicalBudgetTier: "modest",
  },
  "Red Coral": {
    gemstone: "Red Coral",
    mineralSpecies: "Calcium carbonate (organic, precious coral)",
    mohsHardness: "3-4",
    commonTreatments: ["Dyeing (common in lower grades)", "Wax or resin coating"],
    durabilityNote: "Soft and porous; sensitive to heat, chemicals, and acidic substances.",
    careInstructions: "Avoid perfume, chemicals, and ultrasonic cleaning. Wipe gently with a soft, dry cloth.",
    typicalBudgetTier: "modest",
  },
  Emerald: {
    gemstone: "Emerald",
    mineralSpecies: "Beryl",
    mohsHardness: "7.5-8",
    commonTreatments: ["Oiling (industry standard — cedar oil or synthetic resin fills natural fissures)", "Resin filling"],
    durabilityNote: "Hard but often heavily included and brittle — prone to chipping despite the high hardness number.",
    careInstructions: "Avoid ultrasonic/steam cleaning (can strip the oil fill or crack the stone) and sudden temperature changes. Clean only with a soft cloth and mild soap.",
    typicalBudgetTier: "high",
  },
  "Yellow Sapphire": {
    gemstone: "Yellow Sapphire",
    mineralSpecies: "Corundum (aluminum oxide)",
    mohsHardness: "9",
    commonTreatments: ["Heat treatment (industry standard)", "Beryllium diffusion (common for yellow/orange sapphire specifically)"],
    durabilityNote: "Excellent hardness and toughness, suitable for daily wear.",
    careInstructions: "Warm soapy water is generally safe. Diffusion-treated stones carry only a surface-level color layer — mention this if the stone is ever repolished or resized.",
    typicalBudgetTier: "moderate",
  },
  Diamond: {
    gemstone: "Diamond",
    mineralSpecies: "Carbon (cubic crystal structure)",
    mohsHardness: "10",
    commonTreatments: ["HPHT treatment (color improvement)", "Irradiation", "Laser drilling / fracture filling (clarity enhancement)", "Coating"],
    durabilityNote: "Hardest known natural material, but can still chip along cleavage planes from a hard direct blow.",
    careInstructions: "Untreated stones tolerate most cleaning methods well. Fracture-filled or coated stones should avoid ultrasonic cleaning and high heat.",
    typicalBudgetTier: "very high",
  },
  "Blue Sapphire": {
    gemstone: "Blue Sapphire",
    mineralSpecies: "Corundum (aluminum oxide)",
    mohsHardness: "9",
    commonTreatments: ["Heat treatment (industry standard, majority of market)", "Diffusion treatment", "Glass filling (lower grades)"],
    durabilityNote: "Excellent hardness and toughness, suitable for daily wear.",
    careInstructions: "Warm soapy water is generally safe. Avoid harsh chemicals if the stone is glass- or fracture-filled.",
    typicalBudgetTier: "high",
  },
  "Hessonite (Gomed)": {
    gemstone: "Hessonite (Gomed)",
    mineralSpecies: "Grossular garnet",
    mohsHardness: "6.5-7.5",
    commonTreatments: ["Generally untreated — garnet color is naturally stable and treatment is uncommon"],
    durabilityNote: "Good hardness for jewelry use, though somewhat brittle compared to corundum.",
    careInstructions: "Warm soapy water is generally safe for eye-clean stones. Avoid extreme or sudden heat changes.",
    typicalBudgetTier: "modest",
  },
  "Cat's Eye (Lehsunia)": {
    gemstone: "Cat's Eye (Lehsunia)",
    mineralSpecies: "Chrysoberyl (cymophane variety)",
    mohsHardness: "8.5",
    commonTreatments: ["Generally untreated — treatment is uncommon for this species"],
    durabilityNote: "Very hard and tough — one of the most durable gem materials after corundum and diamond.",
    careInstructions: "Tolerates most cleaning methods well; minimal special care needed.",
    typicalBudgetTier: "moderate",
  },
};

export function getGemologyProfile(gemstone: GemstoneName): GemologyProfile {
  return GEMOLOGY_DATA[gemstone];
}

export function getAllGemologyProfiles(): GemologyProfile[] {
  return Object.values(GEMOLOGY_DATA);
}
