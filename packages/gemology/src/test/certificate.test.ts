import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCertificate } from "../certificate.js";

test("checkCertificate never claims verification — always returns not_verified_by_this_app or format_invalid", () => {
  const result = checkCertificate("gia", "2141438155");
  assert.equal(result.status, "not_verified_by_this_app");
  assert.notEqual(result.status, "verified" as any);
});

test("checkCertificate builds a real GIA Report Check deep link for a well-formed GIA number", () => {
  const result = checkCertificate("gia", "2141438155");
  assert.ok(result.reportCheckUrl?.startsWith("https://www.gia.edu/report-check?reportno="));
  assert.ok(result.reportCheckUrl?.includes("2141438155"));
});

test("checkCertificate flags an obviously malformed GIA number as format_invalid rather than passing it through", () => {
  const result = checkCertificate("gia", "not-a-number");
  assert.equal(result.status, "format_invalid");
});

test("checkCertificate handles an unlisted lab without inventing a check-page link", () => {
  const result = checkCertificate("some-unknown-lab", "ABC12345");
  assert.equal(result.laboratory, "Other / unlisted laboratory");
  assert.equal(result.reportCheckUrl, undefined);
  assert.equal(result.status, "not_verified_by_this_app");
});
