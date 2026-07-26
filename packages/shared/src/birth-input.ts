import type { GemstoneName } from "./gemstone-rules.js";

/**
 * What the Consent & Intake Agent collects from the user (row 1 of the
 * top-level flow: "1. Input"). This is the only place free-text place
 * names are allowed to exist — everything downstream operates on
 * resolved coordinates + IANA zone, never on the raw string.
 */
export interface BirthInput {
  /** ISO 8601 date, e.g. "1990-04-12" */
  dateOfBirth: string;
  /** 24h local clock time as stated by the user, e.g. "14:32" */
  timeOfBirth: string;
  /**
   * How confident the user/operator is in the stated time.
   * Feeds the "Birth-data confidence" indicator (Section 11) —
   * an "estimated" time should visibly discount every downstream
   * dasha/transit claim, not silently be treated as exact.
   */
  timeConfidence: "exact" | "approximate" | "unknown";
  /** Free-text place as given by the user, e.g. "Kolkata, West Bengal, India" */
  placeOfBirth: string;
  /** Gemstones the user already wears, if any — feeds the Gemstone
   *  Conflict Agent's existing-gemstone check (Section 6/7). */
  existingGemstones?: GemstoneName[];
  /** Explicit consent record — required before any processing per DPDP notes */
  consent: {
    givenAt: string; // ISO 8601 timestamp
    purposes: ConsentPurpose[];
  };
}

export type ConsentPurpose =
  | "chart_calculation"
  | "gemstone_recommendation"
  | "certificate_verification"
  | "human_expert_review"
  | "outcome_journal";

export interface ResolvedBirthContext {
  input: BirthInput;
  coordinates: GeoCoordinates;
  timezone: ResolvedTimezone;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  /** meters; ephemeris topocentric correction wants this, and it's a
   *  legitimate part of "birth-data confidence" for hill/coastal towns */
  elevationMeters?: number;
  /** Best-matched place name from the geocoding provider — for the
   *  user to confirm we resolved the right town, not a same-named one */
  resolvedPlaceName: string;
  /** 0-1. Low when the geocoder had to guess between multiple matches. */
  matchConfidence: number;
}

export interface ResolvedTimezone {
  /** IANA zone id, e.g. "Asia/Kolkata" — NEVER a bare UTC offset */
  ianaZoneId: string;
  /**
   * The actual historical UTC offset in effect at dateOfBirth/timeOfBirth
   * in this zone, expressed in minutes east of UTC. This is what makes
   * pre-1947 Indian births (multiple regional time standards existed)
   * or DST-era Western births calculate correctly.
   */
  utcOffsetMinutes: number;
  /** True if this offset came from a historical rule change rather
   *  than the zone's current standard offset — surfaced to the user
   *  as a note, not hidden. */
  isHistoricalRule: boolean;
}
