import type { NumerologyProfile } from "@gemstones-ai/shared";

const MASTER_NUMBERS = new Set([11, 22]);

/** Reduces a positive integer to a single digit 1-9, preserving master
 *  numbers 11 and 22 unreduced along the way (standard Vedic/Chaldean
 *  numerology convention). */
function digitalRoot(n: number): number {
  let value = Math.abs(n);
  while (value > 9 && !MASTER_NUMBERS.has(value)) {
    value = String(value)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

/**
 * Friendly-number table for the Mulank/Bhagyank compatibility lookup,
 * keyed by the standard 1-9 planetary rulership (1=Sun, 2=Moon,
 * 3=Jupiter, 4=Rahu, 5=Mercury, 6=Venus, 7=Ketu, 8=Saturn, 9=Mars).
 *
 * PLACEHOLDER — NOT EXPERT-REVIEWED. Numerological friend/enemy tables
 * vary meaningfully between traditions and named authorities. Per this
 * project's own decision-engine design (Section 10: traditional rules
 * must be expert-approved, not model-invented), this table must be
 * replaced with an astrologer/numerologist-curated source — ideally
 * pulled from the Rule-Graph MCP in Phase 2 — before any recommendation
 * derived from it reaches a user.
 */
const FRIENDLY_NUMBERS: Record<number, number[]> = {
  1: [1, 2, 3, 9],
  2: [1, 2, 3, 7],
  3: [1, 2, 3, 9],
  4: [4, 5, 6, 8],
  5: [1, 3, 5, 6],
  6: [4, 5, 6, 9],
  7: [2, 5, 7],
  8: [4, 5, 6, 8],
  9: [1, 2, 3, 9],
};

export interface DateOfBirthParts {
  day: number;
  month: number;
  year: number;
}

export function parseDateOfBirth(isoDate: string): DateOfBirthParts {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { day, month, year };
}

/** Fully reduces to a single digit 1-9, with no master-number exception —
 *  used for Mulank, which by convention is always a simple 1-9 root. */
function fullyReduce(n: number): number {
  let value = Math.abs(n);
  while (value > 9) {
    value = String(value)
      .split("")
      .reduce((sum, digit) => sum + Number(digit), 0);
  }
  return value;
}

export function calculateMulank(day: number): number {
  return fullyReduce(day);
}

export function calculateBhagyank(dob: DateOfBirthParts): number {
  const allDigitsSum =
    String(dob.day).split("").reduce((s, d) => s + Number(d), 0) +
    String(dob.month).split("").reduce((s, d) => s + Number(d), 0) +
    String(dob.year).split("").reduce((s, d) => s + Number(d), 0);
  return digitalRoot(allDigitsSum);
}

export function calculatePersonalYear(
  dob: DateOfBirthParts,
  referenceYear: number
): number {
  const sum =
    dob.day +
    dob.month +
    String(referenceYear).split("").reduce((s, d) => s + Number(d), 0);
  return digitalRoot(sum);
}

export function calculatePersonalMonth(
  personalYear: number,
  referenceMonth: number
): number {
  return digitalRoot(personalYear + referenceMonth);
}

function reduceForLookup(n: number): number {
  // The friendly-number table is keyed 1-9; fold master numbers down
  // for lookup purposes only (the profile itself still reports 11/22).
  return n === 11 ? 2 : n === 22 ? 4 : n;
}

export function buildNumerologyProfile(
  isoDateOfBirth: string,
  referenceDate: Date = new Date()
): NumerologyProfile {
  const dob = parseDateOfBirth(isoDateOfBirth);
  const mulank = calculateMulank(dob.day);
  const bhagyank = calculateBhagyank(dob);
  const personalYear = calculatePersonalYear(dob, referenceDate.getUTCFullYear());
  const personalMonth = calculatePersonalMonth(personalYear, referenceDate.getUTCMonth() + 1);

  const mulankFriends = FRIENDLY_NUMBERS[reduceForLookup(mulank)] ?? [];
  const bhagyankFriends = FRIENDLY_NUMBERS[reduceForLookup(bhagyank)] ?? [];
  const compatibleNumbers = Array.from(
    new Set([...mulankFriends, ...bhagyankFriends])
  ).sort((a, b) => a - b);

  return {
    mulank,
    bhagyank,
    personalYear,
    personalMonth,
    compatibleNumbers,
    referenceDate: referenceDate.toISOString(),
  };
}
