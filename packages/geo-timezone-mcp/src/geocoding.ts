import type { GeoCoordinates } from "@gemstones-ai/shared";

export interface GeocodingProvider {
  resolvePlace(placeText: string): Promise<GeoCoordinates>;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  importance?: number;
}

/**
 * Nominatim-protocol geocoding provider. The public
 * nominatim.openstreetmap.org endpoint has a strict usage policy (rate
 * limits, required User-Agent, no heavy/commercial use) — per the
 * architecture notes, a production deployment should point `baseUrl`
 * at a compliant hosted provider (e.g. a paid Nominatim-compatible
 * host, or Geoapify/LocationIQ/Mapbox) or a self-hosted Nominatim
 * instance, not the public demo endpoint.
 */
export class NominatimGeocodingProvider implements GeocodingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly apiKey?: string
  ) {}

  async resolvePlace(placeText: string): Promise<GeoCoordinates> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("q", placeText);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    if (this.apiKey) url.searchParams.set("key", this.apiKey);

    const response = await fetch(url, {
      headers: { "User-Agent": this.userAgent },
    });
    if (!response.ok) {
      throw new Error(
        `Geocoding provider returned ${response.status} for "${placeText}"`
      );
    }

    const results = (await response.json()) as NominatimResult[];
    if (results.length === 0) {
      throw new Error(`No geocoding match found for "${placeText}"`);
    }

    const best = results[0];
    return {
      latitude: parseFloat(best.lat),
      longitude: parseFloat(best.lon),
      resolvedPlaceName: best.display_name,
      // Nominatim's `importance` is roughly 0-1 and a reasonable proxy
      // for match confidence; default conservatively if absent.
      matchConfidence: best.importance ?? 0.5,
    };
  }
}

/** Fixed-coordinate provider for tests/offline dev — avoids any
 *  network dependency when only exercising the timezone/orchestrator
 *  logic. */
export class StaticGeocodingProvider implements GeocodingProvider {
  constructor(private readonly fixture: Record<string, GeoCoordinates>) {}

  async resolvePlace(placeText: string): Promise<GeoCoordinates> {
    const match = this.fixture[placeText];
    if (!match) {
      throw new Error(`No fixture coordinates registered for "${placeText}"`);
    }
    return match;
  }
}
