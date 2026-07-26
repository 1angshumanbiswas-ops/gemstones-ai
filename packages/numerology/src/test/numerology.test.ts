import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateMulank,
  calculateBhagyank,
  calculatePersonalYear,
  calculatePersonalMonth,
  buildNumerologyProfile,
  parseDateOfBirth,
} from "../index.js";

test("Mulank is the digital root of the day of month", () => {
  assert.equal(calculateMulank(12), 3); // 1+2=3
  assert.equal(calculateMulank(29), 2); // 2+9=11 -> master, then 1+1=2 (11 not preserved for day-only root)
  assert.equal(calculateMulank(9), 9);
});

test("Bhagyank sums all digits of DOB and reduces, preserving master numbers", () => {
  // 1990-04-12 -> digits 1+9+9+0 + 0+4 + 1+2 = 19+4+3=26 -> 2+6=8
  const dob = parseDateOfBirth("1990-04-12");
  assert.equal(calculateBhagyank(dob), 8);
});

test("Personal year reduces day+month+reference-year digits", () => {
  const dob = parseDateOfBirth("1990-04-12");
  // day 12, month 4, year 2026 -> digits 2+0+2+6=10 -> sum=12+4+10=26 -> 2+6=8
  assert.equal(calculatePersonalYear(dob, 2026), 8);
});

test("Personal month reduces personal year + reference month", () => {
  assert.equal(calculatePersonalMonth(8, 7), 6); // 8+7=15 -> 1+5=6
});

test("buildNumerologyProfile returns internally consistent compatible numbers", () => {
  const profile = buildNumerologyProfile("1990-04-12", new Date("2026-07-26T00:00:00Z"));
  assert.equal(profile.mulank, 3);
  assert.equal(profile.bhagyank, 8);
  assert.ok(profile.compatibleNumbers.length > 0);
  assert.ok(profile.compatibleNumbers.every((n) => n >= 1 && n <= 9));
});
