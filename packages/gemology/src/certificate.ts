import type { CertificateCheckResult } from "@gemstones-ai/shared";

/**
 * This app does not call any authenticated lab API and does not
 * scrape lab websites — both explicitly ruled out for the MVP by the
 * architecture ("MVP should use Report Check linking, not
 * unauthorised scraping"). What it CAN honestly do: loosely validate
 * the report-number format, and hand the person a direct link to the
 * issuing laboratory's own public verification page so THEY confirm
 * it, with the lab as the source of truth — never claim this app
 * verified anything itself.
 */

const KNOWN_LABS: Record<string, { name: string; reportCheckUrlTemplate?: string; numberPattern: RegExp }> = {
  gia: {
    name: "GIA (Gemological Institute of America)",
    reportCheckUrlTemplate: "https://www.gia.edu/report-check?reportno={reportNumber}",
    numberPattern: /^\d{7,10}$/,
  },
  igi: {
    name: "IGI (International Gemological Institute)",
    numberPattern: /^[A-Za-z0-9-]{5,20}$/,
  },
  other: {
    name: "Other / unlisted laboratory",
    numberPattern: /^[A-Za-z0-9-]{3,30}$/,
  },
};

export function checkCertificate(labKey: string, reportNumber: string): CertificateCheckResult {
  const normalizedKey = labKey.toLowerCase().trim();
  const lab = KNOWN_LABS[normalizedKey] ?? KNOWN_LABS.other;
  const trimmedNumber = reportNumber.trim();

  if (!lab.numberPattern.test(trimmedNumber)) {
    return {
      laboratory: lab.name,
      reportNumber: trimmedNumber,
      status: "format_invalid",
      guidance: `That doesn't look like a valid ${lab.name} report number format. Double-check it against the physical certificate and try again.`,
    };
  }

  const reportCheckUrl = lab.reportCheckUrlTemplate
    ? lab.reportCheckUrlTemplate.replace("{reportNumber}", encodeURIComponent(trimmedNumber))
    : undefined;

  return {
    laboratory: lab.name,
    reportNumber: trimmedNumber,
    status: "not_verified_by_this_app",
    reportCheckUrl,
    guidance: reportCheckUrl
      ? `This app has not verified this certificate. Click through to ${lab.name}'s own Report Check page to confirm it directly with the laboratory.`
      : `This app has not verified this certificate and does not have a direct check-page link for ${lab.name}. Contact the laboratory directly to confirm authenticity.`,
  };
}
