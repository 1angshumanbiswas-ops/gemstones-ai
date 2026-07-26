import express, { type Request, type Response } from "express";
import cors from "cors";
import type { BirthInput } from "@gemstones-ai/shared";
import { NominatimGeocodingProvider, type GeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "./audit.js";
import { runPhase1Pipeline } from "./pipeline.js";

export function createApp(geocoder: GeocodingProvider) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Cloud Run liveness/readiness probe.
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok", phase: 1 });
  });

  app.post("/api/chart", async (req: Request, res: Response) => {
    const body = req.body as Partial<BirthInput>;

    if (!body.dateOfBirth || !body.timeOfBirth || !body.placeOfBirth) {
      res.status(400).json({
        error: "dateOfBirth, timeOfBirth, and placeOfBirth are required",
      });
      return;
    }

    const input: BirthInput = {
      dateOfBirth: body.dateOfBirth,
      timeOfBirth: body.timeOfBirth,
      timeConfidence: body.timeConfidence ?? "exact",
      placeOfBirth: body.placeOfBirth,
      consent: body.consent ?? {
        givenAt: new Date().toISOString(),
        purposes: ["chart_calculation"],
      },
    };

    try {
      const auditSink = new InMemoryAuditSink();
      const result = await runPhase1Pipeline(input, geocoder, auditSink);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(422).json({ error: message });
    }
  });

  return app;
}

export function buildDefaultGeocoder(): GeocodingProvider {
  return new NominatimGeocodingProvider(
    process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
    process.env.GEOCODING_USER_AGENT ??
      "gemstones-ai/0.1 (contact: set GEOCODING_USER_AGENT env var)",
    process.env.GEOCODING_API_KEY
  );
}
