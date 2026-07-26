import express, { type Request, type Response } from "express";
import cors from "cors";
import type { BirthInput } from "@gemstones-ai/shared";
import { NominatimGeocodingProvider, type GeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "./audit.js";
import { runPipeline, type PipelineResult } from "./pipeline.js";
import { buildReportDocx } from "./report-docx.js";
import { checkCertificate } from "@gemstones-ai/gemology";

export function createApp(geocoder: GeocodingProvider) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // Cloud Run liveness/readiness probe.
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok", phase: 3 });
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
      existingGemstones: body.existingGemstones,
      budgetINR: body.budgetINR,
      consent: body.consent ?? {
        givenAt: new Date().toISOString(),
        purposes: ["chart_calculation"],
      },
    };

    try {
      const auditSink = new InMemoryAuditSink();
      const result = await runPipeline(input, geocoder, auditSink);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(422).json({ error: message });
    }
  });

  // Formats an already-computed PipelineResult (as returned by
  // /api/chart) into a downloadable .docx report. Deliberately does
  // NOT recompute anything — the person downloads exactly what they
  // already saw on screen, not a fresh (and potentially slightly
  // different, since referenceDate defaults to "now") recalculation.
  app.post("/api/report/docx", async (req: Request, res: Response) => {
    try {
      const result = req.body as PipelineResult;
      if (!result?.natalChart || !result?.gemstoneShortlist) {
        res.status(400).json({ error: "Request body must be a full PipelineResult (the /api/chart response)." });
        return;
      }
      const buffer = await buildReportDocx(result);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="gemstones-ai-report-${result.requestId}.docx"`);
      res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Certificate Verification Agent — deliberately does not verify
  // anything itself (per the architecture's explicit "linking, not
  // scraping" MVP guidance). Validates report-number format and hands
  // back a deep link to the issuing lab's own public check page.
  app.post("/api/certificate/check", (req: Request, res: Response) => {
    const { laboratory, reportNumber } = req.body as { laboratory?: string; reportNumber?: string };
    if (!laboratory || !reportNumber) {
      res.status(400).json({ error: "laboratory and reportNumber are required" });
      return;
    }
    const result = checkCertificate(laboratory, reportNumber);
    res.json(result);
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
