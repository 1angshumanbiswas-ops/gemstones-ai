import { find as findTimezones } from "geo-tz";
import { DateTime } from "luxon";
import type { ResolvedTimezone } from "@gemstones-ai/shared";

/**
 * Resolves the IANA timezone for a coordinate (offline, via the
 * timezone-boundary-builder dataset bundled with `geo-tz` — no
 * external API call, which also sidesteps Nominatim-style usage-policy
 * concerns for this step specifically), then asks the IANA tzdata
 * (through luxon, which reads Node's bundled ICU/tzdata) for the
 * *historical* UTC offset actually in effect at the given local
 * civil date/time in that zone. This is what correctly distinguishes,
 * e.g., pre-1980s Indian regional time standards or European DST-era
 * dates from a naive "current UTC offset" assumption.
 */
export function resolveHistoricalTimezone(
  latitude: number,
  longitude: number,
  localDateTimeIso: string // e.g. "1990-04-12T09:02:00", no zone suffix
): ResolvedTimezone {
  const zones = findTimezones(latitude, longitude);
  if (zones.length === 0) {
    throw new Error(
      `No IANA timezone found for coordinates (${latitude}, ${longitude})`
    );
  }
  const ianaZoneId = zones[0];

  const local = DateTime.fromISO(localDateTimeIso, { zone: ianaZoneId });
  if (!local.isValid) {
    throw new Error(
      `Could not interpret "${localDateTimeIso}" in zone ${ianaZoneId}: ${local.invalidReason}`
    );
  }

  const utcOffsetMinutes = local.offset; // minutes east of UTC, DST/historical-rule aware

  // A zone's offset is flagged "historical" when it differs from the
  // offset the same zone reports right now — i.e. a rule change (DST
  // introduction, a redefinition like India's pre-1947 regional times,
  // a whole-zone offset change) happened between then and today.
  const currentOffset = DateTime.now().setZone(ianaZoneId).offset;
  const isHistoricalRule = utcOffsetMinutes !== currentOffset;

  return { ianaZoneId, utcOffsetMinutes, isHistoricalRule };
}

/** Converts a local civil birth date/time + resolved zone into the UTC
 *  instant the Ephemeris MCP needs. */
export function toUtcIso(
  localDateTimeIso: string,
  ianaZoneId: string
): string {
  const local = DateTime.fromISO(localDateTimeIso, { zone: ianaZoneId });
  if (!local.isValid) {
    throw new Error(`Invalid local datetime/zone combination: ${local.invalidReason}`);
  }
  return local.toUTC().toISO({ suppressMilliseconds: true }) as string;
}
